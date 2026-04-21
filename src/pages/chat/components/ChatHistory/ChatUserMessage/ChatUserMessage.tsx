// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import DOMPurify from 'dompurify'
import { FC, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import AttachmentSvg from '@/assets/icons/attachment.svg?react'
import Editor, { EditorRef, EditorValue } from '@/components/Editor/Editor'
import {
  getAnyMentions,
  getAssistantMentions,
  getMessageTextWithMentions,
} from '@/components/Editor/quillModules'
import File from '@/components/File'
import { createFileMetadata, FileMetadata, useFileUpload } from '@/hooks/useFileUpload'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import { ChatMessage } from '@/types/entity/conversation'
import toaster from '@/utils/toaster'

import ChatUserMessageActions from './ChatUserMessageActions'
import EditMessageModal from './EditMessageModal'
import { useChatContext } from '../../../hooks/useChatContext'
import { ChatIndexes } from '../ChatHistory'

interface ChatUserMessageProps {
  message: ChatMessage
  indexes: ChatIndexes
  onSubmit: () => void
}

const MAX_INLINE_EDIT_HEIGHT_PX = 250

const ChatUserMessage: FC<ChatUserMessageProps> = ({ message, indexes, onSubmit }) => {
  const editorRef = useRef<EditorRef>(null)
  const messageElementRef = useRef<HTMLParagraphElement>(null)

  const { request = '', requestRaw = '', fileNames = [] } = message
  const { currentChat } = useSnapshot(chatsStore)
  const { createChatGeneration } = chatGenerationStore
  const { isSharedPage, selectedSkills } = useChatContext()

  const [isEditing, setIsEditing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newPrompt, setNewPrompt] = useState<EditorValue>({
    message: request ?? '',
    messageRaw: requestRaw ?? '',
  })

  const initialFilesMetadata = fileNames.map((f) => createFileMetadata(f))
  const [initialFiles, setInitialFiles] = useState<FileMetadata[]>(initialFilesMetadata)
  const [newFiles, setNewFiles] = useState<FileMetadata[]>(initialFilesMetadata)

  const { inputProps, hasActiveUploads, addFiles, removeFile, openFilePicker } = useFileUpload({
    files: isEditing ? newFiles : initialFiles,
    setFiles: isEditing ? setNewFiles : setInitialFiles,
    handleErrors: (errors) => errors.forEach(({ message }) => toaster.error(message)),
  })
  const isInProgress = message.inProgress

  const canSubmit = (() => {
    if (isEditing) {
      const hasFiles = !!newFiles.length
      const hasPrompt = newPrompt.message.length > 0
      return (hasPrompt || hasFiles) && !hasActiveUploads && !isInProgress
    }

    const hasFiles = !!fileNames.length
    const hasPrompt = request.length > 0
    return (hasPrompt || hasFiles) && !hasActiveUploads && !isInProgress
  })()

  const handleCancelEditing = () => {
    setIsEditing(false)
    setNewPrompt({ message: request ?? '', messageRaw: requestRaw ?? '' })
    setNewFiles(initialFilesMetadata)
  }

  const handleStartEditing = () => {
    if (!messageElementRef.current) {
      setShowEditModal(true)
      return
    }

    const elementHeight = messageElementRef.current.offsetHeight

    if (elementHeight <= MAX_INLINE_EDIT_HEIGHT_PX) {
      setIsEditing(true)
    } else {
      setShowEditModal(true)
    }
  }

  const handleModalSave = (newMessage: string) => {
    setNewPrompt({ message: newMessage, messageRaw: newMessage })
    send({ message: newMessage, messageRaw: newMessage }, newFiles)
    setShowEditModal(false)
    toaster.info('Message updated successfully')
  }

  const send = (promptToSend: EditorValue, filesToSend: FileMetadata[]) => {
    if (!canSubmit) return
    let { message } = promptToSend
    const { messageRaw } = promptToSend

    const assistantMentions = getAssistantMentions(messageRaw)
    if (assistantMentions.length > 1) {
      toaster.error('Only one assistant can be mentioned')
      return
    }

    const assistantId = assistantMentions[0] ?? currentChat?.assistantIds?.[0]

    if (!assistantId) return
    if (getAnyMentions(message).length > 0) {
      message = getMessageTextWithMentions(editorRef.current?.getContent() ?? { ops: [] }, message)
    }

    setNewPrompt({ message: newPrompt.message, messageRaw: newPrompt.messageRaw })

    createChatGeneration({
      message,
      messageRaw: messageRaw || '',
      files: filesToSend.flatMap((f) => (f.fileId !== undefined ? [f.fileId] : [])),
      historyIndex: indexes.historyIndex,
      assistantId,
      isWorkFlow: currentChat?.isWorkflow,
      skillIds: selectedSkills.map((s) => s.value),
    })

    onSubmit()
  }

  const handleConfirmEditing = () => {
    if (!canSubmit) return
    send(newPrompt, newFiles)
    setIsEditing(false)
  }

  const handleResend = () => {
    send({ message: request, messageRaw: requestRaw }, initialFiles)
  }

  const focusEditor = (e: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) editorRef.current?.focus()
  }

  useEffect(() => {
    setInitialFiles(fileNames.map((f) => createFileMetadata(f)))
    setNewFiles(fileNames.map((f) => createFileMetadata(f)))
    setNewPrompt({ message: message.request ?? '', messageRaw: message.requestRaw ?? '' })
  }, [message])

  return (
    <div className="flex items-end flex-col gap-2" data-onboarding="chat-user-message">
      <div className="flex flex-wrap justify-end gap-2">
        <input {...inputProps} />
        {(isEditing ? newFiles : initialFiles).map((f, i) => (
          <File
            file={f}
            withPreview
            withDownload
            key={`${f.fileName}-${i}`}
            withDelete={isEditing}
            onRemove={() => removeFile(i)}
          />
        ))}
      </div>

      <div
        onClick={focusEditor}
        onKeyDown={focusEditor}
        className="flex flex-col bg-gradient1 px-3 py-2 rounded-lg shadow-sm max-w-[70%]"
      >
        {isEditing && (
          <Editor
            value={newPrompt}
            ref={editorRef}
            variant="message"
            onAddFiles={addFiles}
            onChange={setNewPrompt}
            onSubmit={handleConfirmEditing}
          />
        )}

        {!isEditing && (
          <p
            ref={messageElementRef}
            className="chat-editor chat-editor-message text-sm text-wrap break-word"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(requestRaw ?? request ?? '') }}
          />
        )}

        {isEditing && (
          <button
            type="button"
            className="w-fit flex items-center mt-2 gap-2 px-3 -mr-1 py-1.5 rounded-md border border-border-structural bg-surface-base-secondary text-text-primary text-xs hover:bg-button-surface-specific-secondary-button-hover hover:border-border-specific-interactive-outline transition-colors"
            onClick={openFilePicker}
          >
            <AttachmentSvg className="w-4 h-4 text-text-quaternary group-hover:text-text-primary" />
            Attach File
          </button>
        )}
      </div>

      {!isSharedPage && !isInProgress && (
        <ChatUserMessageActions
          isEditing={isEditing}
          request={request}
          canSubmit={canSubmit}
          historyIndex={indexes.historyIndex}
          onCancelEditing={handleCancelEditing}
          onConfirmEditing={handleConfirmEditing}
          onStartEditing={handleStartEditing}
          onResend={handleResend}
        />
      )}

      <EditMessageModal
        visible={showEditModal}
        message={request}
        onClose={() => setShowEditModal(false)}
        onSave={handleModalSave}
      />
    </div>
  )
}

export default ChatUserMessage
