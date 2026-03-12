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

import { FC } from 'react'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check-18.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import Cross18Svg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import ExportToDocxSvg from '@/assets/icons/export-to-docx.svg?react'
import ExportToPdfSvg from '@/assets/icons/export-to-pdf.svg?react'
import ExportToPptxSvg from '@/assets/icons/export-to-pptx.svg?react'
import ExportSvg from '@/assets/icons/export.svg?react'
import OpenSvg from '@/assets/icons/external.svg?react'
import { markdown2html } from '@/components/markdown/Markdown.utils'
import NavigationMore from '@/components/NavigationMore'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatMessage } from '@/types/entity/conversation'
import toaster from '@/utils/toaster'
import { copyRichTextToClipboard } from '@/utils/utils'

import { ChatIndexes } from '../ChatHistory'
import ChatHistoryControls from '../ChatHistoryControls'
import ChatMessageAction from '../ChatMessageAction'
import MessageFeedbackActions from './MessageFeedbackActions/MessageFeedbackActions'

interface ChatAiMessageActionsProps {
  isEditing: boolean
  indexes: ChatIndexes
  message: ChatMessage
  totalMessages: number
  onCancelEditing: () => void
  onConfirmEditing: () => void
  onStartEditing: () => void
  onChangeMessageIndex: (newIndex: number) => void
}

const ChatAiMessageActions: FC<ChatAiMessageActionsProps> = ({
  isEditing,
  indexes,
  message,
  totalMessages,
  onCancelEditing,
  onConfirmEditing,
  onStartEditing,
  onChangeMessageIndex,
}) => {
  const router = useVueRouter()
  const { currentChat, exportConversationAIMessage } = useSnapshot(chatsStore)

  const handleCopyMessage = async () => {
    const plainText = message.response ?? ''
    const htmlContent = markdown2html(plainText)

    await copyRichTextToClipboard(htmlContent, plainText, 'Message copied to clipboard')
  }

  const exportMessage = async (format: string) => {
    if (!currentChat) return

    const success = await exportConversationAIMessage(
      currentChat.id,
      indexes.historyIndex,
      indexes.messageIndex,
      format
    )

    if (success) toaster.info('Message has been exported successfully')
  }

  return (
    <div className="flex gap-4 items-center mt-1">
      <ChatMessageAction label="Copy message" icon={CopySvg} onClick={handleCopyMessage} />

      {isEditing && (
        <>
          <ChatMessageAction
            label="Confirm Changes"
            icon={CheckSvg}
            iconClassName="w-5"
            onClick={onConfirmEditing}
          />
          <ChatMessageAction
            label="Cancel changes"
            icon={Cross18Svg}
            iconClassName="w-5"
            onClick={onCancelEditing}
          />
        </>
      )}

      {!isEditing && (
        <>
          {!currentChat?.isWorkflow && (
            <ChatMessageAction label="Edit message" icon={EditSvg} onClick={onStartEditing} />
          )}

          <NavigationMore
            hideOnClickInside
            customIcon={<ExportSvg className="w-3.5 h-3.5" />}
            className="size-5 min-w-5"
            buttonClassName="hover:bg-transparent opacity-80 hover:opacity-100 m-0 p-0 size-5 flex justify-center items-center"
            data-tooltip-content="Export message"
            items={[
              {
                icon: <ExportToDocxSvg />,
                onClick: () => {
                  exportMessage('docx')
                },
                title: 'Export to DOCX',
              },
              {
                icon: <ExportToPdfSvg />,
                onClick: () => {
                  exportMessage('pdf')
                },
                title: 'Export to PDF',
              },
              {
                icon: <ExportToPptxSvg />,
                onClick: () => {
                  exportMessage('pptx')
                },
                title: 'Export to PPTX',
              },
            ]}
          />

          <MessageFeedbackActions message={message} indexes={indexes} />

          {message.assistantId && message.executionId && (
            <ChatMessageAction
              icon={OpenSvg}
              label="Open execution page"
              href={
                router.resolve({
                  name: 'workflow-execution',
                  params: { workflowId: message.assistantId, executionId: message.executionId },
                }).href
              }
            />
          )}
        </>
      )}

      {!isEditing && (
        <ChatHistoryControls
          totalMessages={totalMessages}
          messageIndex={indexes.messageIndex}
          onChangeMessageIndex={onChangeMessageIndex}
        />
      )}
    </div>
  )
}

export default ChatAiMessageActions
