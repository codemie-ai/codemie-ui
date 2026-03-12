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

import { useState, useRef, FC, memo } from 'react'
import { useSnapshot } from 'valtio'

import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import FolderSvg from '@/assets/icons/folder-move.svg?react'
import PinSvg from '@/assets/icons/pin.svg?react'
import PinnedSvg from '@/assets/icons/pinned.svg?react'
import PeopleSvg from '@/assets/icons/shared-yes.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { type ChatListItem } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

const MAX_NAME_LENGTH = 50
const DEFAULT_CHAT_NAME = 'New chat'

export interface ChatListItemActions {
  moveChat: (chat: ChatListItem) => void
  deleteChat: (chat: ChatListItem) => void
}

interface ChatListItemProps {
  currentChatId?: string
  chat: ChatListItem
  actions: ChatListItemActions
}

const ChatListItem: FC<ChatListItemProps> = memo(
  ({ currentChatId, chat, actions: { moveChat, deleteChat } }) => {
    const { renameChat, pinChat } = useSnapshot(chatsStore)
    const [isEditing, setIsEditing] = useState(false)

    const router = useVueRouter()
    const editNameInputRef = useRef<HTMLInputElement>(null)
    const isActive = chat.id === currentChatId

    let chatName: string = ''
    if (chat.name?.trim()) chatName = chat.name?.trim()
    else chatName = DEFAULT_CHAT_NAME

    const resolveRouteName = (folder?: string) =>
      folder === AVATAR_CHAT_FOLDER ? 'avatar-chat' : 'chats'

    const select = () => {
      router.push({ name: resolveRouteName(chat.folder), params: { id: chat.id } })
    }

    const edit = () => {
      setIsEditing(true)
      setTimeout(() => editNameInputRef.current?.focus(), 0)
    }

    const updateName = async (value: string) => {
      if (!isEditing) return
      await renameChat(chat.id, value?.trim())
      setIsEditing(false)
    }

    return (
      <li
        className={cn(
          'flex items-center justify-between text-text-quaternary hover:text-text-primary transition-colors duration-150 h-9 rounded-lg',
          isActive && '!text-text-primary bg-surface-specific-dropdown-hover'
        )}
      >
        <div className="flex items-center gap-1 grow min-w-0 h-full cursor-pointer">
          {chat.isWorkflow && <WorkflowSvg className="ml-2 w-4 h-4 flex-shrink-0" />}
          {chat.isGroup && !chat.isWorkflow && <PeopleSvg className="ml-2" />}
          {isEditing ? (
            <input
              type="text"
              ref={editNameInputRef}
              className="rounded-lg h-7 w-56 px-1 ml-1 border border-border-primary bg-surface-base-content text-sm text-text-primary transition focus:outline-none"
              defaultValue={chatName}
              onBlur={(e) => updateName(e.target.value)}
              onKeyUp={(e) =>
                e.key === 'Enter' && updateName(editNameInputRef.current?.value ?? '')
              }
            />
          ) : (
            <button
              type="button"
              onClick={select}
              className="text-inherit hover:no-underline truncate pl-2 grow text-sm h-full text-left"
            >
              {chatName.length < MAX_NAME_LENGTH
                ? chatName
                : chatName.slice(0, MAX_NAME_LENGTH) + '...'}
            </button>
          )}
        </div>

        <div className="flex items-center">
          {!isEditing && chat.pinned && <PinnedSvg className="text-inherit" />}
          {!isEditing && (
            <NavigationMore
              renderInRoot
              hideOnClickInside
              items={[
                {
                  title: chat.pinned ? 'Unpin' : 'Pin',
                  onClick: () => pinChat(chat.id),
                  icon: <PinSvg className="icon" />,
                },
                {
                  title: 'Move to folder',
                  onClick: () => moveChat(chat),
                  icon: <FolderSvg className="icon" />,
                },
                { title: 'Rename', onClick: edit, icon: <EditSvg className="icon" /> },
                {
                  title: 'Delete',
                  onClick: () => deleteChat(chat),
                  icon: <ArchiveSvg className="icon" />,
                },
              ]}
            />
          )}
        </div>
      </li>
    )
  }
)

export default ChatListItem
