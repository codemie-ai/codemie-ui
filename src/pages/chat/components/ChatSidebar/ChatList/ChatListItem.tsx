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
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { useState, useRef, FC, memo, useContext } from 'react'
import { useSnapshot } from 'valtio'

import AssistantSVG from '@/assets/icons/assistant.svg?react'
import Announcement from '@/components/Announcement'
import Avatar from '@/components/Avatar/Avatar'
import AvatarGroup from '@/components/Avatar/AvatarGroup'
import { AvatarType } from '@/constants/avatar'
import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { useVueRouter } from '@/hooks/useVueRouter'
import { isImportedChat } from '@/pages/chat/components/ChatSidebar/ChatSidebarLists/chatSidebarFolderHelpers'
import {
  useResolveChatAvatar,
  useResolveGroupChatAvatars,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { chatsStore } from '@/store/chats'
import { ChatListDensity } from '@/store/chatViewSettings'
import { type ChatListItem } from '@/types/entity/conversation'
import { formatDateTime } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import ChatListItemContextMenu from './ChatListItemContextMenu'
import ChatListItemTooltip from './ChatListItemTooltip'
import { ChatSidebarSelectContext } from './chatSidebarSelection'

const DEFAULT_CHAT_NAME = 'New chat'

const getChatDisplayName = (chat: ChatListItem, resolvedName?: string) => {
  if (chat.name?.trim() && !chat.pendingRename) return chat.name.trim()
  return resolvedName ?? DEFAULT_CHAT_NAME
}

const getRowSpacingClassName = (isCompact: boolean, hasRelativeTimestamp: boolean) => {
  if (isCompact) return 'h-8 mb-1'
  if (hasRelativeTimestamp) return 'min-h-12 py-1 mb-1.5'
  return 'h-9 mb-1.5'
}

const hasChatRelativeTimestamp = (
  chat: ChatListItem,
  isCompact: boolean,
  showRelativeTimestamp: boolean
) => !isCompact && showRelativeTimestamp && !!(chat.updateDate || chat.date)

// Height plus bottom margin in rem, matching getRowSpacingClassName.
export const getChatRowHeightRem = (
  chat: ChatListItem,
  density: ChatListDensity,
  showRelativeTimestamp: boolean
) => {
  const isCompact = density === ChatListDensity.COMPACT
  if (isCompact) return 2.25
  if (hasChatRelativeTimestamp(chat, isCompact, showRelativeTimestamp)) return 3.375
  return 2.625
}

export interface ChatListItemActions {
  moveChat: (chat: ChatListItem) => void
  removeChatFromFolder?: (chat: ChatListItem) => void
  deleteChat: (chat: ChatListItem) => void
}

export type RegisterChatElement = (chatId: string, element: HTMLLIElement | null) => void

interface ChatListItemProps {
  currentChatId?: string
  chat: ChatListItem
  actions: ChatListItemActions
  hideAvatar?: boolean
  density?: ChatListDensity
  showRelativeTimestamp?: boolean
  registerChatElement?: RegisterChatElement
  virtualIndex?: number
}

const ChatListItem: FC<ChatListItemProps> = memo(
  ({
    currentChatId,
    chat,
    actions: { moveChat, removeChatFromFolder, deleteChat },
    hideAvatar = false,
    density = ChatListDensity.DETAILED,
    showRelativeTimestamp = false,
    registerChatElement,
    virtualIndex,
  }) => {
    const { renameChat, pinChat } = useSnapshot(chatsStore)
    const { iconUrl: resolvedIconUrl, name: resolvedName } = useResolveChatAvatar(chat)
    const groupAvatars = useResolveGroupChatAvatars(chat)
    const [isEditing, setIsEditing] = useState(false)
    const [isTooltipOpen, setIsTooltipOpen] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const router = useVueRouter()
    const onSidebarSelect = useContext(ChatSidebarSelectContext)
    const editNameInputRef = useRef<HTMLInputElement>(null)
    const { announcement, announce } = useAnnouncementQueue()
    const isActive = chat.id === currentChatId
    const isImportChat = isImportedChat(chat)
    const isCompact = density === ChatListDensity.COMPACT
    const hasRelativeTimestamp = hasChatRelativeTimestamp(chat, isCompact, showRelativeTimestamp)
    const rowSpacingClassName = getRowSpacingClassName(isCompact, hasRelativeTimestamp)

    const hasTooltipContent = !!(resolvedName || chat.date)

    const { refs, floatingStyles, context } = useFloating({
      open: isTooltipOpen && hasTooltipContent,
      onOpenChange: setIsTooltipOpen,
      placement: 'right',
      middleware: [offset(8), flip(), shift({ padding: 8 })],
    })

    const hover = useHover(context, {
      delay: { open: 500, close: 0 },
      enabled: hasTooltipContent && !isEditing && !isMenuOpen,
    })
    const focus = useFocus(context, { enabled: hasTooltipContent && !isEditing && !isMenuOpen })
    const dismiss = useDismiss(context, { ancestorScroll: true })
    const role = useRole(context, { role: 'tooltip' })
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

    const chatName = getChatDisplayName(chat, resolvedName)

    const resolveRouteName = (folder?: string | null) =>
      folder === AVATAR_CHAT_FOLDER ? 'avatar-chat' : 'chats'

    const select = () => {
      onSidebarSelect?.(chat.id)
      router.push({ name: resolveRouteName(chat.folder), params: { id: chat.id } })
    }

    const edit = () => {
      setIsTooltipOpen(false)
      setIsEditing(true)
      setTimeout(() => editNameInputRef.current?.focus(), 0)
    }

    const updateName = async (value: string) => {
      if (!isEditing) return
      await renameChat(chat.id, value?.trim())
      setIsEditing(false)
    }

    const handlePin = () => {
      const willBePinned = !chat.pinned
      pinChat(chat.id).then(() => {
        announce(willBePinned ? 'Chat pinned' : 'Chat unpinned')
        setTimeout(() => {
          document.getElementById(`chat-name-${chat.id}`)?.focus()
        }, 0)
      })
    }

    return (
      <>
        <li
          role="treeitem"
          aria-selected={isActive}
          ref={(element) => registerChatElement?.(chat.id, element)}
          data-chat-id={chat.id}
          data-index={virtualIndex}
          className={cn(
            // relative: contains the absolutely positioned sr-only "Pinned" label, which otherwise
            // escapes the list's scroll clipping and stretches the whole page.
            'relative flex items-center justify-between rounded-lg px-2 text-text-secondary transition-colors duration-150 hover:text-text-primary',
            rowSpacingClassName,
            isActive && '!text-text-primary bg-surface-specific-dropdown-hover'
          )}
        >
          <div
            ref={refs.setReference}
            className="flex items-center gap-2 grow min-w-0 h-full cursor-pointer"
            {...getReferenceProps()}
          >
            {!isCompact &&
              !hideAvatar &&
              (chat.isGroup ? (
                <AvatarGroup
                  iconUrls={groupAvatars.map((a) => a.iconUrl)}
                  names={groupAvatars.map((a) => a.name)}
                />
              ) : (
                <Avatar
                  iconUrl={resolvedIconUrl}
                  name={resolvedName}
                  type={AvatarType.XS}
                  className="shrink-0"
                />
              ))}

            {isCompact && !hideAvatar && chat.isGroup && (
              <span className="flex flex-row gap-0.5 border-white border-1 rounded-md pl-1 pr-1.5 py-0.5 bg-neutral-710 items-center">
                <AssistantSVG className="h-3.5" />
                <span className="text-xs-1">{groupAvatars.length}</span>
              </span>
            )}

            {isEditing ? (
              <input
                type="text"
                ref={editNameInputRef}
                className="rounded-lg h-7 grow px-1 border border-border-primary bg-surface-base-content text-sm text-text-primary transition focus:outline-none"
                defaultValue={chatName}
                onBlur={(e) => updateName(e.target.value)}
                onKeyUp={(e) =>
                  e.key === 'Enter' && updateName(editNameInputRef.current?.value ?? '')
                }
              />
            ) : (
              <button
                type="button"
                id={`chat-name-${chat.id}`}
                onClick={select}
                aria-describedby={chat.pinned ? `pinned-status-${chat.id}` : undefined}
                className={cn(
                  'min-w-0 grow text-left text-sm text-inherit hover:no-underline',
                  isCompact ? 'truncate' : 'flex h-full flex-col justify-center'
                )}
              >
                <span className="block truncate">{chatName}</span>
                {hasRelativeTimestamp && (
                  <span className="block truncate text-xs text-text-tertiary">
                    {formatDateTime(chat.updateDate ?? chat.date, 'relative')}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center">
            {!isEditing && chat.pinned && (
              <span id={`pinned-status-${chat.id}`} className="sr-only">
                Pinned
              </span>
            )}
            {!isEditing && (
              <ChatListItemContextMenu
                chat={chat}
                isImportChat={isImportChat}
                pinChat={handlePin}
                moveChat={moveChat}
                removeChatFromFolder={removeChatFromFolder}
                deleteChat={deleteChat}
                edit={edit}
                contextId={`chat-name-${chat.id}`}
                onOpenChange={(open) => {
                  setIsMenuOpen(open)
                  if (open) setIsTooltipOpen(false)
                }}
              />
            )}
          </div>
        </li>

        {isTooltipOpen && hasTooltipContent && (
          <ChatListItemTooltip
            floatingRef={refs.setFloating}
            floatingStyles={floatingStyles}
            getFloatingProps={getFloatingProps}
            chatName={chatName}
            chat={chat}
            resolvedIconUrl={resolvedIconUrl}
            resolvedName={resolvedName}
            groupAvatars={groupAvatars}
            isImportChat={isImportChat}
          />
        )}
        <Announcement announcement={announcement} />
      </>
    )
  }
)

export default ChatListItem
