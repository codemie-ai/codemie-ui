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

import { useState } from 'react'
import { useSnapshot } from 'valtio'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { AssistantFolderDeleteAction } from '@/types/chats'

interface AssistantFolderDeletePopupProps {
  assistantId?: string
  assistantName?: string
  isVisible: boolean
  onHide: () => void
}

const AssistantFolderDeletePopup = ({
  assistantId,
  assistantName,
  isVisible,
  onHide,
}: AssistantFolderDeletePopupProps) => {
  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore)
  const [pendingAction, setPendingAction] = useState<AssistantFolderDeleteAction | null>(null)

  const handleDelete = async (action: AssistantFolderDeleteAction) => {
    if (!assistantId) return
    setPendingAction(action)
    try {
      const result = await chatsStore.deleteAssistantFolder(assistantId, action)
      if (currentChat?.id && result.deleted_conversation_ids.includes(currentChat.id)) {
        chatsStore.clearCurrentChat()
        const nextChat = chatsStore.chats[0]
        if (nextChat) router.push({ name: 'chats', params: { id: nextChat.id } })
        else router.push({ name: 'new-chat' })
      }
      onHide()
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Popup
      limitWidth
      visible={isVisible}
      hideClose
      header={`Delete ${assistantName || 'Assistant Folder'}?`}
      withBorder={false}
      onHide={onHide}
      footerContent={
        <div className="flex grow flex-wrap justify-end gap-3 pb-3">
          <Button variant={ButtonType.BASE} disabled={pendingAction !== null} onClick={onHide}>
            Cancel
          </Button>
          <Button
            variant={ButtonType.BASE}
            isLoading={pendingAction === 'delete_chats_only'}
            disabled={pendingAction !== null}
            onClick={() => handleDelete('delete_chats_only')}
          >
            Delete chats only
          </Button>
          <Button
            variant={ButtonType.DELETE}
            isLoading={pendingAction === 'delete_folder_and_chats'}
            disabled={pendingAction !== null}
            onClick={() => handleDelete('delete_folder_and_chats')}
          >
            <DeleteSvg /> Delete folder &amp; chats
          </Button>
        </div>
      }
    >
      <p className="mb-3">
        Chats currently inside this Assistant Folder will be permanently deleted; pinned chats are
        kept. Chats moved to Custom Folders are not affected, and the assistant itself is not
        deleted. Deleting chats only keeps an empty folder; deleting the folder removes it until you
        start a new chat with this assistant, or a pinned chat keeps it visible.
      </p>
    </Popup>
  )
}

export default AssistantFolderDeletePopup
