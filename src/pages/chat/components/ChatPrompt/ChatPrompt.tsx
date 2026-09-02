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
import { FC, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import PlaySvg from '@/assets/icons/play.svg?react'
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
import ChatControls from '@/pages/chat/components/ChatControls'
import { useAssistantFeatures } from '@/pages/chat/hooks/useAssistantFeatures'
import { useChatContext } from '@/pages/chat/hooks/useChatContext'
import { useChatPromptDraft } from '@/pages/chat/hooks/useChatPromptDraft'
import { useFilePaste } from '@/pages/chat/hooks/useFilePaste'
import { usePremiumModelTip } from '@/pages/chat/hooks/usePremiumModelTip'
import { useToolPermissions } from '@/pages/chat/hooks/useToolPermissions'
import { assistantsStore, userStore } from '@/store'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import ChatPromptFileUpload from './ChatPromptFileUpload'
import ChatPromptLlmSelector from './ChatPromptLlmSelector'
import ChatPromptSkillsButton from './ChatPromptSkillsButton'
import ChatPromptToolCallPolicy from './ChatPromptToolCallPolicy'
import ChatPromptVoiceRecorder from './ChatPromptVoiceRecorder'
import DynamicToolsSettings from './DynamicToolsSettings'

const PROMPT_MODES = {
  DEFAULT: 'default',
  WORKFLOW: 'workflow',
  WORKFLOW_INTERRUPTED: 'workflow_interrupted',
} as const

type PromptMode = (typeof PROMPT_MODES)[keyof typeof PROMPT_MODES]

const PLACEHOLDERS: Record<PromptMode, string> = {
  [PROMPT_MODES.DEFAULT]: "Ask anything or add an assistant with '@'",
  [PROMPT_MODES.WORKFLOW]: 'Ask anything',
  [PROMPT_MODES.WORKFLOW_INTERRUPTED]: 'Leave empty or type a message for the next step',
}

const SUBMIT_LABELS: Record<PromptMode, React.ReactNode> = {
  [PROMPT_MODES.DEFAULT]: 'Send',
  [PROMPT_MODES.WORKFLOW]: 'Send',
  [PROMPT_MODES.WORKFLOW_INTERRUPTED]: (
    <>
      <PlaySvg /> Continue
    </>
  ),
}

interface ChatPromptProps {
  resizable?: boolean
  externalPrompt?: string | null
  onExternalPromptConsumed?: () => void
}

const getBorderWrapperClassName = (
  resizable: boolean,
  isInterrupted: boolean,
  isEditorFocused: boolean,
  isInProgress: boolean
) =>
  cn(
    'box-content p-px rounded-xl w-full max-w-5xl mx-auto',
    resizable ? 'h-full flex flex-col' : 'min-h-fit',
    !isInterrupted && 'border-gradient promp-shadow prompt-border-gradient',
    !isInterrupted && isEditorFocused && 'prompt-border-gradient-focused',
    !isInterrupted && isInProgress && 'prompt-border-gradient-in-progress',
    isInterrupted && 'bg-interrupted-primary',
    isInProgress && 'pointer-events-none'
  )

const noopAddFiles = (_files: File[]) => undefined

const resolveFileHandler = (
  canAttachFiles: boolean,
  addFiles: (files: File[]) => void
): ((files: File[]) => void) => (canAttachFiles ? addFiles : noopAddFiles)

const ChatPrompt: FC<ChatPromptProps> = ({
  resizable = false,
  externalPrompt,
  onExternalPromptConsumed,
}) => {
  const editorRef = useRef<EditorRef>(null)
  const { isDark } = useTheme()
  const { currentChat } = useSnapshot(chatsStore)
  const { userData, user } = useSnapshot(userStore)
  const { defaultAssistant } = useSnapshot(assistantsStore)
  const { selectedSkills, isSharedPage, dynamicToolsConfig, canAttachFiles } = useChatContext()
  const { initial, saveDraft, clearDraft } = useChatPromptDraft(currentChat?.id, user?.userId)

  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [prompt, setPrompt] = useState<{ message: string; messageRaw: string }>(initial)

  const [files, setFiles] = useState<FileMetadata[]>([])
  const fileUpload = useFileUpload({
    files,
    setFiles,
    handleErrors: (errors) => {
      errors.forEach(({ message }) => toaster.error(message))
    },
  })

  const assistantFeatures = useAssistantFeatures(currentChat?.assistantData ?? [])

  const { setupPasteHandler } = useFilePaste({
    onFilePaste: resolveFileHandler(canAttachFiles, fileUpload.addFiles),
  })

  const isInProgress = currentChat?.history.flat().some((m) => m.inProgress)
  const isInterrupted = currentChat?.isInterrupted
  const onAddFiles = resolveFileHandler(canAttachFiles, fileUpload.addFiles)
  const isToolCallPending =
    !currentChat?.isWorkflow &&
    !!currentChat?.history
      .at(-1)
      ?.at(-1)
      ?.thoughts?.some((t) => t.interrupted)
  const isPromptDisabled = !!isInProgress || isToolCallPending

  useEffect(() => {
    if (!canAttachFiles && files.length > 0) {
      setFiles([])
    }
  }, [canAttachFiles, files.length])

  const toolPermissions = useToolPermissions()
  const { isPremiumActive } = usePremiumModelTip()

  let promptMode: PromptMode = PROMPT_MODES.DEFAULT
  if (isInterrupted) promptMode = PROMPT_MODES.WORKFLOW_INTERRUPTED
  else if (currentChat?.isWorkflow) promptMode = PROMPT_MODES.WORKFLOW

  const placeholder = PLACEHOLDERS[promptMode]
  const submitLabel = SUBMIT_LABELS[promptMode]

  const canSubmit = (() => {
    if (isInterrupted) return !isInProgress && !fileUpload.hasActiveUploads
    const hasFiles = canAttachFiles && !!files.length
    const hasPrompt = prompt.message.length > 0
    return (hasPrompt || hasFiles) && !fileUpload.hasActiveUploads && !isInProgress
  })()

  const handleSubmit = () => {
    if (!canSubmit) return

    if (isInterrupted) {
      const userInput = prompt.message.trim() || undefined
      const fileNames = canAttachFiles ? files.flatMap((f) => (f.fileId ? [f.fileId] : [])) : []
      clearDraft()
      setPrompt({ message: '', messageRaw: '' })
      setFiles([])
      chatGenerationStore.resumeWorkflowExecution(userInput, fileNames)
      return
    }

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

    clearDraft()
    setPrompt({ message: '', messageRaw: '' })
    const fileIds = canAttachFiles ? files.map((f) => f.fileId!) : []
    setFiles([])

    chatGenerationStore.createChatGeneration({
      message,
      messageRaw: messageRaw ?? '',
      files: fileIds,
      assistantId,
      isWorkFlow: currentChat?.isWorkflow,
      skillIds: selectedSkills.map((s) => s.value),
      dynamicToolsConfig,
    })
  }

  const handleStopGeneration = () => {
    if (currentChat) {
      chatGenerationStore.stopChatGeneration(currentChat.id)
    }
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) e.preventDefault()
  }

  const focusEditor = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) editorRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' '))
      editorRef.current?.focus()
  }

  const isVoiceRecorderVisible = !!userData?.stt_support && !isPromptDisabled && !isInterrupted

  useEffect(() => {
    editorRef.current?.focus()
  }, [currentChat?.id])

  useEffect(() => {
    if (externalPrompt) {
      setPrompt({ message: externalPrompt, messageRaw: sanitizeMessage(externalPrompt) })
      onExternalPromptConsumed?.()
    }
  }, [externalPrompt])

  useEffect(() => {
    saveDraft(prompt)
  }, [prompt, saveDraft])

  return (
    <div className={cn('relative w-full z-20', resizable && 'h-full flex flex-col')}>
      {currentChat?.isInterrupted && <ChatControls chatId={currentChat!.id} />}
      <div
        className={cn(
          'w-full flex flex-col px-6 overflow-y-auto z-10',
          resizable ? 'flex-1 min-h-0' : 'min-h-32 h-fit -translate-y-3 shrink-0'
        )}
      >
        <div
          className={getBorderWrapperClassName(
            resizable,
            !!isInterrupted || isToolCallPending,
            isEditorFocused,
            !!isInProgress
          )}
        >
          <div
            role="none"
            onClick={focusEditor}
            onMouseDown={handleMouseDown}
            onKeyDown={handleKeyDown}
            data-onboarding="chat-input"
            className={cn(
              'flex flex-col gap-2 p-2 rounded-xl bg-surface-elevated cursor-text',
              resizable ? 'h-full min-h-0' : 'min-h-32 max-h-64',
              isPremiumActive && 'ring-1 ring-aborted-primary/60'
            )}
          >
            <div className={cn('flex flex-col grow min-h-0', isInProgress && 'opacity-60')}>
              <Editor
                ref={editorRef}
                value={prompt}
                withMentions={!currentChat?.isWorkflow}
                onChange={setPrompt}
                onAddFiles={onAddFiles}
                disabled={isPromptDisabled}
                onSubmit={handleSubmit}
                onFocusChange={setIsEditorFocused}
                onEditorLoad={setupPasteHandler}
                placeholder={placeholder}
              />
            </div>

            <div
              role="none"
              onClick={focusEditor}
              onMouseDown={handleMouseDown}
              onKeyDown={handleKeyDown}
              className="flex justify-between items-center pl-2"
            >
              <div className={cn('flex items-center gap-2', isPromptDisabled && 'opacity-60')}>
                {assistantFeatures.fileAttachment && canAttachFiles && (
                  <ChatPromptFileUpload {...fileUpload} files={files} />
                )}
                {!currentChat?.isWorkflow && !isSharedPage && (
                  <>
                    {assistantFeatures.tools && (
                      <DynamicToolsSettings disabled={isPromptDisabled} />
                    )}
                    {assistantFeatures.modelSelector && (
                      <ChatPromptLlmSelector disabled={isPromptDisabled} />
                    )}
                    {assistantFeatures.skills && (
                      <ChatPromptSkillsButton disabled={isPromptDisabled} />
                    )}
                    {assistantFeatures.tools &&
                      toolPermissions.loaded &&
                      toolPermissions.allowOverride && (
                        <ChatPromptToolCallPolicy
                          policy={toolPermissions.policy}
                          disabled={isPromptDisabled}
                          onChange={toolPermissions.setPolicy}
                        />
                      )}
                  </>
                )}
              </div>

              <div
                className={cn('flex items-center ml-auto', isInProgress && 'pointer-events-auto')}
              >
                {isVoiceRecorderVisible && (
                  <ChatPromptVoiceRecorder
                    onTextReady={(text) => setPrompt({ message: text, messageRaw: text })}
                  />
                )}

                {isVoiceRecorderVisible && <div className="bg-border-primary h-4 w-px mr-4 ml-2" />}

                {isInProgress && (
                  <Button
                    aria-label="Stop generation"
                    size={ButtonSize.LARGE}
                    onClick={handleStopGeneration}
                  >
                    <StopSvg className={cn(isDark && 'text-white')} />
                  </Button>
                )}
                {!isInProgress && !isToolCallPending && (
                  <Button
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    size={ButtonSize.LARGE}
                    className="select-none"
                  >
                    {submitLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPrompt
