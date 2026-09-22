// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import AvatarGroup from '@/components/Avatar/AvatarGroup'
import { Checkbox } from '@/components/form/Checkbox'
import Popup from '@/components/Popup'
import { AvatarType } from '@/constants/avatar'
import { isImportedChat } from '@/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers'
import {
  resolveChatAvatar,
  resolveGroupChatAvatars,
  useAvatarStores,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { chatsStore } from '@/store/chats'
import { ChatListDensity, chatViewSettingsStore } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

interface AddChatsToFolderPopupProps {
  folderName?: string
  isVisible: boolean
  onHide: () => void
}

const getChatName = (chat: ChatListItem, entityName?: string) =>
  chat.name?.trim() || entityName?.trim() || 'New chat'

const AddChatsToFolderPopup = ({ folderName, isVisible, onHide }: AddChatsToFolderPopupProps) => {
  const { chats, isMovingChatsToFolder } = useSnapshot(chatsStore)
  const { density } = useSnapshot(chatViewSettingsStore)
  const avatarStores = useAvatarStores()
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  const showAvatars = density === ChatListDensity.DETAILED

  const eligibleChats = useMemo(
    () =>
      (chats as readonly ChatListItem[])
        .filter((chat) => !isImportedChat(chat) && chat.folder !== folderName)
        .sort((a, b) =>
          getChatName(a, resolveChatAvatar(a, avatarStores).name).localeCompare(
            getChatName(b, resolveChatAvatar(b, avatarStores).name)
          )
        ),
    [avatarStores, chats, folderName]
  )
  const eligibleChatIds = useMemo(
    () => new Set(eligibleChats.map((chat) => chat.id)),
    [eligibleChats]
  )

  useEffect(() => {
    if (isVisible) setSelectedChatIds([])
  }, [isVisible, folderName])

  useEffect(() => {
    setSelectedChatIds((current) => current.filter((id) => eligibleChatIds.has(id)))
  }, [eligibleChatIds])

  const toggleChat = (chatId: string, checked: boolean) => {
    setSelectedChatIds((current) =>
      checked ? [...current, chatId] : current.filter((id) => id !== chatId)
    )
  }

  const handleSubmit = async () => {
    const eligibleSelectedChatIds = selectedChatIds.filter((id) => eligibleChatIds.has(id))
    if (!folderName || eligibleSelectedChatIds.length === 0) return
    try {
      await chatsStore.moveChatsToFolder(eligibleSelectedChatIds, folderName)
      onHide()
    } catch {
      // The store shows the error toast and refreshes partial server state.
    }
  }

  return (
    <Popup
      visible={isVisible}
      header={folderName ? `Add chats to ${folderName}` : 'Add chats'}
      headerDescription="A chat can belong to one custom folder at a time."
      submitText="Add chats"
      submitDisabled={selectedChatIds.length === 0 || isMovingChatsToFolder}
      onHide={onHide}
      onSubmit={handleSubmit}
      limitWidth
    >
      <div className="flex max-h-96 flex-col gap-1 overflow-y-auto py-1">
        {eligibleChats.length > 0 ? (
          eligibleChats.map((chat) => {
            const avatars = chat.isGroup
              ? resolveGroupChatAvatars(chat, avatarStores)
              : [resolveChatAvatar(chat, avatarStores)]

            return (
              <div
                key={chat.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-specific-dropdown-hover"
              >
                <Checkbox
                  id={`add-chat-to-folder-${chat.id}`}
                  checked={selectedChatIds.includes(chat.id)}
                  onChange={(checked) => toggleChat(chat.id, checked)}
                  rootClassName="mt-0.5 shrink-0"
                />
                {showAvatars &&
                  (chat.isGroup ? (
                    <AvatarGroup
                      iconUrls={avatars.map((avatar) => avatar.iconUrl)}
                      names={avatars.map((avatar) => avatar.name)}
                    />
                  ) : (
                    <Avatar
                      iconUrl={avatars[0].iconUrl}
                      name={avatars[0].name}
                      type={AvatarType.XS}
                      className="shrink-0"
                    />
                  ))}
                <label
                  htmlFor={`add-chat-to-folder-${chat.id}`}
                  className="min-w-0 grow cursor-pointer"
                >
                  <span className="block truncate text-sm text-text-primary">
                    {getChatName(chat, avatars[0].name)}
                  </span>
                  {chat.folder && (
                    <span className="block truncate text-xs text-text-tertiary">
                      Current folder: {chat.folder}
                    </span>
                  )}
                </label>
              </div>
            )
          })
        ) : (
          <p className="px-2 py-4 text-center text-sm text-text-tertiary">
            No eligible chats to add
          </p>
        )}
      </div>
    </Popup>
  )
}

export default AddChatsToFolderPopup
