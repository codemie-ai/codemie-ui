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

import {
  FC,
  Fragment,
  useMemo,
  useState,
  useRef,
  KeyboardEvent,
  useLayoutEffect,
  ReactNode,
} from 'react'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import ProcessingCompleteSvg from '@/assets/icons/processing-status.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Markdown from '@/components/markdown/Markdown'
import Thought from '@/components/Thought/Thought'
import { ButtonSize, ButtonType } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import { ToolCallAction } from '@/types/chatGeneration'
import { ChatMessage } from '@/types/entity/conversation'
import { formatDateTime } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import './ChatAiMessage.scss'
import ChatAiAuthPrompt, { ChatAuthPrompt } from './ChatAiAuthPrompt'
import ChatAiInteractiveBlock from './ChatAiInteractiveBlock'
import ChatAiMessageActions from './ChatAiMessageActions'
import ThinkingLoader from './ThinkingLoader'
import { useChatContext } from '../../../hooks/useChatContext'
import { ChatIndexes } from '../ChatHistory'
import EditMessageModal from '../ChatUserMessage/EditMessageModal'

interface ChatAiMessageProps {
  indexes: ChatIndexes
  message: ChatMessage
  totalMessages: number
  onChangeMessageIndex: (newIndex: number) => void
}

const MAX_INLINE_EDIT_HEIGHT_PX = 250

const ChatAiMessage: FC<ChatAiMessageProps> = ({
  indexes,
  message,
  totalMessages,
  onChangeMessageIndex,
}) => {
  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const { selectedAssistant, openConfigForm, closeConfig, isSharedPage, hideToolOutputs } =
    useChatContext()

  const [isEditing, setIsEditing] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newResponse, setNewResponse] = useState('')
  // For an interactive-widget message, "edit" means unlocking the (otherwise
  // read-only, already-answered) form so the user can re-answer it.
  const [isFormEditing, setIsFormEditing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messageElementRef = useRef<HTMLDivElement>(null)

  const handleCancelEditing = () => {
    setIsEditing(false)
    setNewResponse('')
  }

  const handleConfirmEditing = async () => {
    if (!newResponse.trim()) {
      toaster.error('Message cannot be empty')
      return
    }

    if (!currentChat) {
      toaster.error('No active chat found')
      return
    }

    try {
      await chatGenerationStore.editChatGeneration(
        currentChat.id,
        indexes.historyIndex,
        indexes.messageIndex,
        newResponse
      )
      setIsEditing(false)
      onChangeMessageIndex(indexes.messageIndex + 1)
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  const handleStartEditing = () => {
    // Editing a widget message re-answers its form (unlock it) rather than opening
    // the plain-text editor.
    if (message.interactiveRequest) {
      setIsFormEditing(true)
      return
    }

    const messageText = message.response ?? ''

    if (!messageElementRef.current) {
      setShowEditModal(true)
      return
    }

    const elementHeight = messageElementRef.current.offsetHeight

    if (elementHeight <= MAX_INLINE_EDIT_HEIGHT_PX) {
      setNewResponse(messageText)
      setIsEditing(true)
    } else {
      setShowEditModal(true)
    }
  }

  const handleModalSave = async (newMessage: string) => {
    if (!newMessage.trim()) {
      toaster.error('Message cannot be empty')
      return
    }

    if (!currentChat) {
      toaster.error('No active chat found')
      return
    }

    try {
      await chatGenerationStore.editChatGeneration(
        currentChat.id,
        indexes.historyIndex,
        indexes.messageIndex,
        newMessage
      )
      setShowEditModal(false)
      onChangeMessageIndex(indexes.messageIndex + 1)
      toaster.info('Message updated successfully')
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      handleCancelEditing()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleConfirmEditing()
    }
  }

  const isInProgress = message.inProgress

  const processingTime = useMemo(() => {
    return message.processingTime == null ? null : message.processingTime.toFixed(2)
  }, [message.processingTime])

  const handleAvatarClick = () => {
    if (currentChat?.isWorkflow && message.assistant?.id) {
      // For workflow chats, navigate to workflow details page
      router.push({ name: 'view-workflow', params: { workflowId: message.assistant.id } })
    } else if (message.assistant?.id) {
      // For regular chats, open config sidebar
      if (selectedAssistant?.id === message.assistantId) closeConfig()
      else openConfigForm(message.assistant.id)
    }
  }

  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, newResponse])

  // Map every possible auth gate for this turn under one object; ChatAiAuthPrompt decides what to
  // render (MCP takes precedence, otherwise the set per-user OAuth prompts are stacked).
  const authPrompt: ChatAuthPrompt = {
    mcpRows: message.mcpAuthPromptRows ?? undefined,
    gitlab: message.gitlabAuthPrompt ?? undefined,
    jira: message.jiraAuthPrompt ?? undefined,
    confluence: message.confluenceAuthPrompt ?? undefined,
  }
  const hasAuthPrompt = Boolean(
    authPrompt.mcpRows?.length || authPrompt.gitlab || authPrompt.jira || authPrompt.confluence
  )
  const authPromptElement: ReactNode = hasAuthPrompt ? (
    <ChatAiAuthPrompt
      authPrompt={authPrompt}
      chatId={currentChat?.id ?? ''}
      historyIndex={indexes.historyIndex}
      messageIndex={indexes.messageIndex}
    />
  ) : null

  return (
    <div className="flex gap-4 min-w-0" data-onboarding="chat-ai-message">
      <Avatar
        type={AvatarType.CHAT}
        iconUrl={message.assistant?.iconUrl}
        name={message.assistant?.name}
        onClick={handleAvatarClick}
        withTooltip
      />

      <div className="flex flex-col grow min-w-0">
        <div className="flex items-center h-10">
          {!isInProgress && (
            <div className="flex gap-2 text-xs items-center text-text-quaternary">
              <ProcessingCompleteSvg />
              {processingTime !== null && <>Processed in: {processingTime}s / </>}
              <span>{formatDateTime(message.createdAt, 'short')} </span>
            </div>
          )}

          {isInProgress && <ThinkingLoader />}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          {message?.thoughts?.map((thought) => (
            <Fragment key={thought.id}>
              {(!hideToolOutputs || thought.interrupted) && <Thought thought={thought} />}
              {thought.interrupted && !currentChat?.isWorkflow && !isSharedPage && (
                <div className="flex justify-end gap-2">
                  <Button
                    type={ButtonType.DELETE}
                    size={ButtonSize.MEDIUM}
                    onClick={() =>
                      chatGenerationStore.resumeToolCall(thought.id, ToolCallAction.DENY)
                    }
                  >
                    <CrossSvg className="w-4 h-4" />
                    Deny
                  </Button>
                  <Button
                    type={ButtonType.PRIMARY}
                    size={ButtonSize.MEDIUM}
                    onClick={() =>
                      chatGenerationStore.resumeToolCall(thought.id, ToolCallAction.ALLOW)
                    }
                  >
                    <CheckSvg className="w-4 h-4" />
                    Allow
                  </Button>
                </div>
              )}
            </Fragment>
          ))}
        </div>

        {isEditing && (
          <textarea
            ref={textareaRef}
            value={newResponse}
            onKeyDown={handleKeyDown}
            onChange={(e) => setNewResponse(e.target.value)}
            className={cn(
              'ai-message-edit-textarea p-3 text-sm leading-6 overflow-hidden break-words rounded-lg border-border-primary transition hover:border-border-secondary focus:border-border-secondary',
              'resize-none outline-none',
              'bg-surface-base-primary border border-border-structural',
              'mt-4 mb-2'
            )}
          />
        )}

        {!isEditing && (
          <div ref={messageElementRef}>
            {authPromptElement ?? (
              <>
                <Markdown
                  className="mt-4"
                  content={message.stream?.getStream() ?? message.response}
                />
                {message.loginUrl && (
                  <Button
                    type={ButtonType.SECONDARY}
                    size={ButtonSize.SMALL}
                    className="mt-3"
                    onClick={() => window.open(message.loginUrl!, '_blank', 'noopener,noreferrer')}
                  >
                    Login to MCP Server
                  </Button>
                )}
                <ChatAiInteractiveBlock
                  message={message}
                  indexes={indexes}
                  isFormEditing={isFormEditing}
                  onSubmitted={() => setIsFormEditing(false)}
                />
              </>
            )}
          </div>
        )}

        {!isInProgress && !isSharedPage && (
          <ChatAiMessageActions
            isEditing={isEditing}
            indexes={indexes}
            message={message}
            totalMessages={totalMessages}
            onChangeMessageIndex={onChangeMessageIndex}
            onCancelEditing={handleCancelEditing}
            onConfirmEditing={handleConfirmEditing}
            onStartEditing={handleStartEditing}
          />
        )}

        <EditMessageModal
          visible={showEditModal}
          message={message.response ?? ''}
          onClose={() => setShowEditModal(false)}
          onSave={handleModalSave}
        />
      </div>
    </div>
  )
}

export default ChatAiMessage
