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

import { Accordion, AccordionTab } from 'primereact/accordion'
import { useState, FC } from 'react'
import { useSnapshot } from 'valtio'

import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import Plus from '@/assets/icons/plus.svg?react'
import AvatarGroup from '@/components/Avatar/AvatarGroup'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import Tooltip from '@/components/Tooltip'
import { useVueRouter } from '@/hooks/useVueRouter'
import {
  resolveChatAvatar,
  resolveGroupChatAvatars,
  useAvatarStores,
  type ResolvedChatAvatar,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { chatsStore } from '@/store/chats'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'

import DeleteFolderPopup from './DeleteFolderPopup'
import FolderFormPopup from './FolderFormPopup'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions } from '../ChatList/ChatListItem'

const MAX_CHAT_NAME_LENGTH = 22

interface FolderListProps {
  folders: string[]
  activeFolderIndex: number | null
  chatActions: ChatListItemActions
  currentChatId?: string
  foldersToChatsMap: Record<string, ChatListItemType[]>
  setActiveFolder: (folder: string | null) => void
}

const FolderList: FC<FolderListProps> = ({
  folders,
  chatActions,
  activeFolderIndex,
  currentChatId,
  foldersToChatsMap,
  setActiveFolder,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>()
  const [isDeleteFolderPopupVisible, setIsDeleteFolderPopupVisible] = useState(false)
  const [isFolderFormPopupVisible, setIsFolderFormPopupVisible] = useState(false)

  const router = useVueRouter()
  const { chats } = useSnapshot(chatsStore) as typeof chatsStore
  const avatarStores = useAvatarStores()

  const addFolderChat = async (folderName: string) => {
    const folderChatIds = foldersToChatsMap[folderName] ?? []
    const latestChat = chats.find((chat) => chat.id === folderChatIds[0]?.id)

    const assistantId = latestChat?.initialAssistantId ?? latestChat?.assistantIds?.[0] ?? ''
    const isWorkflow = latestChat?.isWorkflow ?? false

    await chatsStore.startNewChat(assistantId, folderName, isWorkflow)
    router.push({ name: 'new-chat' })
  }

  const getMenuItems = (folder: string): NavigationItem[] => [
    {
      title: 'Add chat',
      icon: <Plus />,
      onClick: (e) => {
        e.stopPropagation()
        addFolderChat(folder)
      },
    },
    {
      title: 'Edit folder',
      icon: <EditSvg />,
      onClick: (e) => {
        e.stopPropagation()
        setSelectedFolder(folder)
        setIsFolderFormPopupVisible(true)
      },
    },
    {
      title: 'Delete folder',
      icon: <ArchiveSvg />,
      onClick: (e) => {
        e.stopPropagation()
        setSelectedFolder(folder)
        setIsDeleteFolderPopupVisible(true)
      },
    },
  ]

  const setActiveFolderIndex = (index: number) => {
    setActiveFolder(folders[index] || null)
  }

  return (
    <div>
      <Tooltip target=".chat-sidebar-folder" appendTo={null} delay={0} />
      <Accordion
        activeIndex={activeFolderIndex}
        onTabChange={(e) => setActiveFolderIndex(e.index as number)}
        expandIcon={() => null}
        collapseIcon={() => null}
      >
        {folders.map((folder) => {
          const isOverMaxLength = folder.length > MAX_CHAT_NAME_LENGTH
          const folderChats = foldersToChatsMap[folder] ?? []

          const seen = new Set<string>()
          const uniqueAvatarItems: ResolvedChatAvatar[] = []

          for (const chat of folderChats) {
            if (chat.isGroup && chat.assistantIds.length > 0) {
              const avatars = resolveGroupChatAvatars(chat, avatarStores)
              chat.assistantIds.forEach((id, i) => {
                if (id && !seen.has(id)) {
                  seen.add(id)
                  uniqueAvatarItems.push(
                    avatars[i] ?? { iconUrl: null, name: chat.assistantNames?.[i] }
                  )
                }
              })
            } else {
              const key =
                chat.initialAssistantId ?? `${chat.iconUrl ?? ''}:${chat.assistantNames?.[0] ?? ''}`
              if (!seen.has(key)) {
                seen.add(key)
                uniqueAvatarItems.push(resolveChatAvatar(chat, avatarStores))
              }
            }
          }

          const getChatAssistantIds = (c: ChatListItemType): string[] => {
            if (c.isGroup) return c.assistantIds ?? []
            if (c.initialAssistantId) return [c.initialAssistantId]
            return []
          }
          const uniqueAssistantIds = new Set(folderChats.flatMap(getChatAssistantIds))
          const hasSingleAssistant = uniqueAssistantIds.size === 1

          return (
            <AccordionTab
              key={folder}
              pt={{
                headerAction: (opts) => ({
                  href: null,
                  tabIndex: 0,
                  'aria-label': folder,
                  'data-folder': folder,
                  'data-folder-open': opts?.context.selected,
                  role: 'treeitem',
                  'aria-expanded': opts?.context.selected ?? false,
                  'aria-owns': `chat-tree-folder-group-${folder
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')}`,
                }),
              }}
              header={() => (
                <div className="flex items-center justify-between px-2 text-sm">
                  <div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis h-9">
                    <AvatarGroup
                      iconUrls={uniqueAvatarItems.map((a) => a.iconUrl)}
                      names={uniqueAvatarItems.map((a) => a.name)}
                      className="mr-2 shrink-0"
                    />
                    <p
                      data-pr-tooltip={isOverMaxLength ? folder : ''}
                      className="font-semibold whitespace-nowrap h-full flex items-center overflow-hidden text-ellipsis chat-sidebar-folder"
                    >
                      {folder.slice(0, MAX_CHAT_NAME_LENGTH) + (isOverMaxLength ? '...' : '')}
                    </p>
                  </div>

                  <div className="flex items-center">
                    <NavigationMore
                      renderInRoot
                      autoAlignment
                      hideOnClickInside
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                      }}
                      items={getMenuItems(folder)}
                    />
                  </div>
                </div>
              )}
            >
              <div className="flex flex-col border-l ml-4 pl-4 border-border-secondary">
                <ChatList
                  chats={folderChats}
                  chatActions={chatActions}
                  currentChatId={currentChatId}
                  hideAvatar={hasSingleAssistant}
                />
              </div>
            </AccordionTab>
          )
        })}
      </Accordion>

      <DeleteFolderPopup
        selectedFolder={selectedFolder}
        isVisible={isDeleteFolderPopupVisible}
        onHide={() => setIsDeleteFolderPopupVisible(false)}
      />

      <FolderFormPopup
        isEditing
        folder={selectedFolder}
        isVisible={isFolderFormPopupVisible}
        onHide={() => setIsFolderFormPopupVisible(false)}
      />
    </div>
  )
}

export default FolderList
