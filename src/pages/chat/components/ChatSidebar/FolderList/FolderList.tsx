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
import FolderIcon from '@/assets/icons/folder.svg?react'
import Plus from '@/assets/icons/plus.svg?react'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import Tooltip from '@/components/Tooltip'
import { useVueRouter } from '@/hooks/useVueRouter'
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

  const addFolderChat = async (folderName: string) => {
    const folderChatIds = foldersToChatsMap[folderName] ?? []
    const latestChat = chats.find((chat) => chat.id === folderChatIds[0]?.id)

    const assistantId = latestChat?.initialAssistantId ?? latestChat?.assistantIds?.[0] ?? ''
    const isWorkflow = latestChat?.isWorkflow ?? false
    const newChat = await chatsStore.createChat(assistantId, folderName, isWorkflow)

    router.push({ name: 'chats', params: { id: newChat.id } })
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

          return (
            <AccordionTab
              key={folder}
              pt={{ headerAction: { href: null, tabIndex: 0, 'aria-label': folder } }}
              header={() => (
                <div className="flex items-center justify-between my-1 ml-2 text-sm">
                  <div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis h-12">
                    <FolderIcon className="mr-2 h-8" />
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
                  chats={foldersToChatsMap[folder] ?? []}
                  chatActions={chatActions}
                  currentChatId={currentChatId}
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
