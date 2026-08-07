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

import { useSnapshot } from 'valtio'

import ConfirmationModal from '@/components/ConfirmationModal'
import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

interface DeleteChatPopupProps {
  isVisible: boolean
  selectedChat?: ChatListItem
  onHide: () => void
}

const DeleteChatPopup = ({ isVisible, selectedChat, onHide }: DeleteChatPopupProps) => {
  const router = useVueRouter()
  const { currentChat, chats } = useSnapshot(chatsStore)

  const resolveRouteName = (folder?: string) =>
    folder === AVATAR_CHAT_FOLDER ? 'avatar-chat' : 'chats'

  const confirmDelete = async () => {
    if (!selectedChat) return

    const { id, folder = '' } = selectedChat
    const folderChats = chats.filter((c) => c.folder === folder)
    const candidateNextIndex = folderChats.findIndex((c) => c.id === id) + 1
    const candidateNext = folderChats[candidateNextIndex] ?? folderChats[0]

    await chatsStore.deleteChat(id ?? '')

    if (folder) {
      const hasChatsInFolder = folderChats.length - 1 > 0
      if (!hasChatsInFolder) {
        await chatsStore.deleteChatFolder(folder, false)
      }
    }

    onHide()

    if (id !== currentChat?.id) return

    const nextChat =
      (candidateNext && chats.find((c) => c.id === candidateNext.id)) ??
      chats.find((c) => c.folder === folder) ??
      chats[0]

    if (!nextChat) return
    router.push({ name: resolveRouteName(nextChat.folder), params: { id: nextChat.id } })
  }

  return (
    <ConfirmationModal
      limitWidth
      header="Delete Chat?"
      onCancel={onHide}
      visible={isVisible}
      onConfirm={confirmDelete}
      message={
        selectedChat?.folder &&
        chats.filter((c) => (c.folder ?? '') === (selectedChat.folder ?? '')).length === 1
          ? 'This is the last chat in the folder. The folder will be removed and a new chat will be opened.'
          : 'This action will permanently erase all messages in this conversation. It cannot be undone.'
      }
    />
  )
}

export default DeleteChatPopup
