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

import { FC, useState } from 'react'
import { useSnapshot } from 'valtio'

import CheckSvg from '@/assets/icons/check-18.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import BasketSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import { copyToClipboard } from '@/utils/utils'

import ChatMessageAction from '../ChatMessageAction'

interface ChatUserMessageActionsProps {
  isEditing: boolean
  request: string
  canSubmit?: boolean
  historyIndex: number
  onCancelEditing: () => void
  onConfirmEditing: () => void
  onStartEditing: () => void
  onResend: () => void
}

const ChatUserMessageActions: FC<ChatUserMessageActionsProps> = ({
  isEditing,
  request,
  canSubmit = true,
  historyIndex,
  onCancelEditing,
  onConfirmEditing,
  onStartEditing,
  onResend,
}) => {
  const { currentChat } = useSnapshot(chatsStore)
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false)

  const handleCopyMessage = () => {
    copyToClipboard(request, 'Message copied to clipboard')
  }

  const handleDeleteMessage = async () => {
    if (!currentChat?.id) return

    setIsDeletePopupVisible(false)

    try {
      await chatGenerationStore.deleteChatMessage(currentChat.id, historyIndex)
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  return (
    <div className="flex gap-4 items-center">
      {!isEditing && (
        <ChatMessageAction label="Copy message" icon={CopySvg} onClick={handleCopyMessage} />
      )}

      {!currentChat?.isWorkflow && !isEditing && (
        <ChatMessageAction label="Edit message" icon={EditSvg} onClick={onStartEditing} />
      )}

      {isEditing && (
        <>
          <ChatMessageAction
            label="Confirm Changes"
            icon={CheckSvg}
            iconClassName="w-5"
            onClick={onConfirmEditing}
            isDisabled={!canSubmit}
          />
          <ChatMessageAction
            label="Cancel changes"
            icon={CrossSvg}
            iconClassName="w-5"
            onClick={onCancelEditing}
          />
        </>
      )}

      <ChatMessageAction
        label="Resend message"
        icon={RefreshSvg}
        iconClassName="w-3 h-3"
        onClick={onResend}
      />
      <ChatMessageAction
        label="Delete message"
        icon={BasketSvg}
        onClick={() => setIsDeletePopupVisible(true)}
      />

      <ConfirmationModal
        limitWidth
        header="Delete message"
        message="Are you sure you want to delete message?"
        visible={isDeletePopupVisible}
        onConfirm={handleDeleteMessage}
        confirmButtonType={ButtonType.DELETE}
        onCancel={() => setIsDeletePopupVisible(false)}
      />
    </div>
  )
}

export default ChatUserMessageActions
