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

import './ChatPrompt.scss'
import { FC, MouseEvent, useEffect, useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'
import { useSnapshot } from 'valtio'

import StopSvg from '@/assets/icons/stop.svg?react'
import Button from '@/components/Button'
import Editor, { EditorRef } from '@/components/Editor/Editor'
import {
  getAnyMentions,
  getAssistantMentions,
  getMessageTextWithMentions,
} from '@/components/Editor/quillModules'
import { sanitizeMessage } from '@/components/markdown/Markdown.utils'
import { ButtonSize } from '@/constants'
import { FileMetadata, useFileUpload } from '@/hooks/useFileUpload'
import { useTheme } from '@/hooks/useTheme'
import { assistantsStore, userStore } from '@/store'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import ChatPromptFileUpload from './ChatPromptFileUpload'
import ChatPromptLlmSelector from './ChatPromptLlmSelector'
import ChatPromptSkillsButton from './ChatPromptSkillsButton'
import ChatPromptStarters from './ChatPromptStarters'
import ChatPromptVoiceRecorder from './ChatPromptVoiceRecorder'
import DynamicToolsSettings from './DynamicToolsSettings'
import { useChatContext } from '../../hooks/useChatContext'
import { useFilePaste } from '../../hooks/useFilePaste'
import ChatControls from '../ChatControls'

const ChatPrompt: FC = () => {
  const editorRef = useRef<EditorRef>(null)
  const { isDark } = useTheme()
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const { userData } = useSnapshot(userStore)
  const { defaultAssistant } = useSnapshot(assistantsStore)
  const { stopChatGeneration } = useSnapshot(chatGenerationStore)
  const { selectedSkills, isSharedPage, dynamicToolsConfig } = useChatContext()

  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [prompt, setPrompt] = useState<{ message: string; messageRaw: string }>({
    message: '',
    messageRaw: '',
  })

  const [files, setFiles] = useState<FileMetadata[]>([])
  const fileUpload = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message }) => toaster.error(message))
    },
  })

  const { setupPasteHandler } = useFilePaste({
    onFilePaste: fileUpload.addFiles,
  })

  const isInProgress = currentChat?.history.at(-1)?.at(-1)?.inProgress
  const isInterrupted = currentChat?.isInterrupted

  const canSubmit = (() => {
    const hasFiles = !!files.length
    const hasPrompt = prompt.message.length > 0

    return (
      (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress && !isInterrupted
    )
  })()

  const handleSubmit = () => {
    if (!canSubmit) return
    let { message } = prompt
    const { messageRaw } = prompt

    const assistantMentions = getAssistantMentions(messageRaw)
    if (assistantMentions.length > 1) {
      toaster.error('Only one assistant can be mentioned')
      return
    }

    const assistantId =
      assistantMentions[0] ?? currentChat?.assistantIds?.[0] ?? defaultAssistant?.id

    if (!assistantId) {
      toaster.error(
        'You should address an assistant. Type @ to see available options or visit the marketplace to browse globally available assistants.'
      )
      return
    }

    if (getAnyMentions(message).length > 0) {
      message = getMessageTextWithMentions(editorRef.current?.getContent() ?? { ops: [] }, message)
    }

    setPrompt({ message: '', messageRaw: '' })
    setFiles([])

    chatGenerationStore.createChatGeneration({
      message,
      messageRaw: messageRaw ?? '',
      files: files.map((f) => f.fileId!),
      assistantId,
      isWorkFlow: currentChat?.isWorkflow,
      skillIds: selectedSkills.map((s) => s.value),
      dynamicToolsConfig,
    })
  }

  const handleStopGeneration = () => {
    if (currentChat) {
      stopChatGeneration(currentChat.id)
    }
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) e.preventDefault()
  }

  const focusEditor = (e: MouseEvent<HTMLDivElement>) => {
    if (isInterrupted) return
    if (e.target === e.currentTarget) editorRef.current?.focus()
  }

  const isVoiceRecorderVisible = !!userData?.stt_support && !isInProgress && !isInterrupted

  useEffect(() => {
    if (!isInterrupted) editorRef.current?.focus()
  }, [currentChat?.id])

  const hasChatHistory = !!currentChat?.history.length

  return (
    <>
      {!hasChatHistory && (
        <ChatPromptStarters
          onStarterClick={(text) => setPrompt({ message: text, messageRaw: sanitizeMessage(text) })}
        />
      )}
      <div className="relative w-full">
        {currentChat?.isInterrupted && <ChatControls chatId={currentChat!.id} />}
        <div className="w-full flex flex-col px-6 scrollbar-gutter overflow-y-auto min-h-32 h-fit -translate-y-3 z-10 shrink-0">
          <div
            className={twJoin(
              'p-px rounded-xl border-gradient promp-shadow w-full max-w-5xl mx-auto prompt-border-gradient min-h-fit',
              isEditorFocused && 'prompt-border-gradient-focused',
              isInProgress && 'prompt-border-gradient-in-progress',
              isInterrupted && 'opacity-60 pointer-events-none'
            )}
          >
            <div
              onClick={focusEditor}
              onMouseDown={handleMouseDown}
              className={cn(
                'flex flex-col gap-2 p-2 rounded-xl bg-surface-elevated min-h-32 max-h-64',
                !isInterrupted && 'cursor-text'
              )}
            >
              <Editor
                ref={editorRef}
                value={prompt}
                withMentions={!currentChat?.isWorkflow}
                onChange={setPrompt}
                onAddFiles={fileUpload.addFiles}
                disabled={isInterrupted}
                onSubmit={handleSubmit}
                onFocusChange={setIsEditorFocused}
                onEditorLoad={setupPasteHandler}
                placeholder={
                  currentChat?.isWorkflow
                    ? 'Ask anything'
                    : "Ask anything or add an assistant with '@'"
                }
              />

              <div
                onClick={focusEditor}
                onMouseDown={handleMouseDown}
                className="flex justify-between items-center pl-2"
              >
                <div className="flex items-center gap-2">
                  <ChatPromptFileUpload {...fileUpload} files={files} />
                  {!currentChat?.isWorkflow && !isSharedPage && (
                    <>
                      <DynamicToolsSettings disabled={!!isInProgress} />
                      <ChatPromptLlmSelector disabled={!!isInProgress} />
                      <ChatPromptSkillsButton disabled={!!isInProgress} />
                    </>
                  )}
                </div>

                <div className="flex items-center ml-auto">
                  {isVoiceRecorderVisible && (
                    <ChatPromptVoiceRecorder
                      onTextReady={(text) => setPrompt({ message: text, messageRaw: text })}
                    />
                  )}

                  {isVoiceRecorderVisible && (
                    <div className="bg-border-primary h-4 w-px mr-4 ml-2" />
                  )}

                  {isInProgress ? (
                    <Button size={ButtonSize.LARGE} onClick={handleStopGeneration}>
                      <StopSvg className={cn(isDark && 'text-white')} />
                    </Button>
                  ) : (
                    <Button
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      size={ButtonSize.LARGE}
                      className="select-none"
                    >
                      Send
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatPrompt
