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
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { useState, useRef, FC, memo } from 'react'
import { useSnapshot } from 'valtio'

import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import FolderSvg from '@/assets/icons/folder-move.svg?react'
import PinSvg from '@/assets/icons/pin.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import AvatarGroup from '@/components/Avatar/AvatarGroup'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { AvatarType } from '@/constants/avatar'
import { AVATAR_CHAT_FOLDER } from '@/constants/chats'
import { useVueRouter } from '@/hooks/useVueRouter'
import {
  useResolveChatAvatar,
  useResolveGroupChatAvatars,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { chatsStore } from '@/store/chats'
import { type ChatListItem } from '@/types/entity/conversation'
import { formatDate } from '@/utils/helpers'
import { cn } from '@/utils/utils'

const MAX_NAME_LENGTH = 50
const DEFAULT_CHAT_NAME = 'New chat'

export interface ChatListItemActions {
  moveChat: (chat: ChatListItem) => void
  removeChatFromFolder?: (chat: ChatListItem) => void
  deleteChat: (chat: ChatListItem) => void
}

interface ChatListItemProps {
  currentChatId?: string
  chat: ChatListItem
  actions: ChatListItemActions
  hideAvatar?: boolean
}

const ChatListItem: FC<ChatListItemProps> = memo(
  ({
    currentChatId,
    chat,
    actions: { moveChat, removeChatFromFolder, deleteChat },
    hideAvatar = false,
  }) => {
    const { renameChat, pinChat } = useSnapshot(chatsStore)
    const { iconUrl: resolvedIconUrl, name: resolvedName } = useResolveChatAvatar(chat)
    const groupAvatars = useResolveGroupChatAvatars(chat)
    const [isEditing, setIsEditing] = useState(false)
    const [isTooltipOpen, setIsTooltipOpen] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const router = useVueRouter()
    const editNameInputRef = useRef<HTMLInputElement>(null)
    const isActive = chat.id === currentChatId

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
    const role = useRole(context, { role: 'tooltip' })
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role])

    let chatName: string = ''
    if (chat.name?.trim()) chatName = chat.name.trim()
    else chatName = resolvedName ?? DEFAULT_CHAT_NAME

    const resolveRouteName = (folder?: string | null) =>
      folder === AVATAR_CHAT_FOLDER ? 'avatar-chat' : 'chats'

    const select = () => {
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

    const tooltipEntries = (() => {
      if (chat.isWorkflow) {
        return [
          {
            key: `workflow:${chat.initialWorkflowId ?? chat.id}`,
            iconUrl: resolvedIconUrl,
            name: resolvedName,
            type: 'Workflow' as const,
          },
        ]
      }
      if (chat.isGroup) {
        const keyOccurrences = new Map<string, number>()

        return groupAvatars.flatMap((avatar, index) => {
          if (!avatar.name) return []

          const identity =
            chat.assistantIds?.[index] ??
            JSON.stringify([avatar.iconUrl ?? null, avatar.name ?? null])
          const occurrence = keyOccurrences.get(identity) ?? 0

          keyOccurrences.set(identity, occurrence + 1)

          return [
            {
              ...avatar,
              key: `assistant:${identity}:${occurrence}`,
              type: 'Assistant' as const,
            },
          ]
        })
      }
      return [
        {
          key: `assistant:${chat.initialAssistantId ?? chat.id}`,
          iconUrl: resolvedIconUrl,
          name: resolvedName,
          type: 'Assistant' as const,
        },
      ]
    })()

    return (
      <>
        <li
          role="treeitem"
          aria-selected={isActive}
          data-chat-id={chat.id}
          className={cn(
            'flex items-center justify-between text-text-secondary hover:text-text-primary transition-colors duration-150 h-9 rounded-lg px-2 mb-1.5',
            isActive && '!text-text-primary bg-surface-specific-dropdown-hover'
          )}
        >
          <div
            ref={refs.setReference}
            className="flex items-center gap-2 grow min-w-0 h-full cursor-pointer"
            {...getReferenceProps()}
          >
            {!hideAvatar &&
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
                onClick={select}
                className="text-inherit hover:no-underline truncate grow text-sm h-full text-left"
              >
                {chatName.length <= MAX_NAME_LENGTH
                  ? chatName
                  : chatName.slice(0, MAX_NAME_LENGTH) + '...'}
                {chat.pinned && <span className="sr-only">Pinned</span>}
              </button>
            )}
          </div>

          <div className="flex items-center">
            {!isEditing && (
              <NavigationMore
                renderInRoot
                hideOnClickInside
                onOpenChange={(open) => {
                  setIsMenuOpen(open)
                  if (open) setIsTooltipOpen(false)
                }}
                items={[
                  {
                    title: chat.pinned ? 'Unpin' : 'Pin',
                    onClick: () => pinChat(chat.id),
                    icon: <PinSvg className="icon" />,
                  },
                  {
                    title: chat.folder ? 'Change folder' : 'Add to folder',
                    onClick: () => moveChat(chat),
                    icon: <FolderSvg className="icon" />,
                  },
                  ...(chat.folder
                    ? [
                        {
                          title: 'Remove from folder',
                          onClick: (event) => {
                            event.stopPropagation()
                            removeChatFromFolder?.(chat)
                          },
                          icon: <FolderSvg className="icon" />,
                        },
                      ]
                    : []),
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

        {isTooltipOpen && hasTooltipContent && (
          <FloatingPortal>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-surface-base-secondary rounded-lg text-text-primary shadow-lg border border-border-primary w-[360px] pointer-events-none flex flex-col py-2 gap-4"
            >
              <h3 className="px-3 m-0 text-base font-semibold truncate">{chatName}</h3>

              <ul className="list-none m-0 px-3 py-0 flex flex-col gap-3">
                {tooltipEntries.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-center justify-between gap-[60px] leading-loose"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        iconUrl={entry.iconUrl}
                        name={entry.name}
                        type={AvatarType.XS}
                        className="shrink-0"
                      />
                      <span className="truncate text-sm text-text-primary">{entry.name}</span>
                    </div>
                    <span className="text-sm text-text-quaternary shrink-0">{entry.type}</span>
                  </li>
                ))}
              </ul>

              {chat.date && (
                <div className="flex flex-col gap-4">
                  <hr className="mx-3 border-0 border-t border-border-primary" />
                  <dl className="m-0 px-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs leading-relaxed">
                    <dt className="text-text-quaternary">Created</dt>
                    <dd className="m-0 text-text-quaternary text-right">
                      {formatDate(chat.date, 'dd LLL yyyy, HH:mm')}
                    </dd>
                    {chat.updateDate && (
                      <>
                        <dt className="text-text-quaternary">Last updated</dt>
                        <dd className="m-0 text-text-quaternary text-right">
                          {formatDate(chat.updateDate, 'dd LLL yyyy, HH:mm')}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </FloatingPortal>
        )}
      </>
    )
  }
)

export default ChatListItem
