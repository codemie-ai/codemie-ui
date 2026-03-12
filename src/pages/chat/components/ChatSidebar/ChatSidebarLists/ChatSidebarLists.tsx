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

import { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import AddFolderSvg from '@/assets/icons/folder-add.svg?react'
import Spinner from '@/components/Spinner'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import ChatList from '../ChatList/ChatList'
import DeleteChatPopup from '../ChatList/DeleteChatPopup'
import MoveChatPopup from '../ChatList/MoveChatPopup'
import FolderFormPopup from '../FolderList/FolderFormPopup'
import FolderList from '../FolderList/FolderList'

type SectionName = 'chats' | 'folders'
type PopupName = 'delete-chat' | 'folder-form' | 'move-chat'

const ChatSidebarLists = () => {
  const { chats, currentChat, chatFolders, isChatsLoading } = useSnapshot(
    chatsStore
  ) as typeof chatsStore

  const [selectedChat, setSelectedChat] = useState<ChatListItem>()
  const [activePopup, setActivePopup] = useState<PopupName | null>(null)
  const [activeSection, setActiveSection] = useState<SectionName | null>(null)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [hasManuallyExpandedSection, setHasManuallyExpandedSection] = useState(false)

  const defaultChats = useMemo(
    () => chats.filter((chat) => !chat.folder || chat.isWorkflow),
    [chats]
  )

  const foldersToChatsMap = useMemo(() => {
    return chats.reduce((acc: Record<string, ChatListItem[]>, chat) => {
      if (chat.folder) {
        acc[chat.folder] = acc[chat.folder] ?? []
        acc[chat.folder].push(chat)
      }

      return acc
    }, {})
  }, [chats])

  const folders = useMemo(() => {
    return chatFolders
      .slice()
      .sort(
        (a, b) => new Date(b.updateDate ?? '').getTime() - new Date(a.updateDate ?? '').getTime()
      )
      .map((folder) => folder.name)
  }, [chatFolders])

  const activeFolderIndex = useMemo(() => {
    const folderIndex = folders.findIndex((folder) => folder === activeFolder)
    return folderIndex === -1 ? null : folderIndex
  }, [activeFolder, JSON.stringify(folders)])

  const handleHidePopup = () => setActivePopup(null)
  const handleToggleSection = (name: SectionName) => {
    setHasManuallyExpandedSection(true)
    setActiveSection(activeSection === name ? null : name)
  }

  const handleMoveChat = (folderName: string) => {
    if (currentChat?.id === selectedChat?.id) {
      setActiveSection(folderName === DEFAULT_CHAT_FOLDER ? 'chats' : 'folders')
      setActiveFolder(folderName)
    }
  }

  const handleCreateFolder = () => {
    setActiveSection('folders')
    setActiveFolder(null)
  }

  useEffect(() => {
    // Auto-switch sections only if:
    // 1. User hasn't manually toggled sections yet, OR
    // 2. We're in loading state (new chat being created/navigated to)
    if (currentChat && (!hasManuallyExpandedSection || isChatsLoading)) {
      setActiveSection(currentChat.folder ? 'folders' : 'chats')
    }
    if (currentChat?.folder) setActiveFolder(currentChat.folder)
  }, [currentChat?.id, isChatsLoading, hasManuallyExpandedSection])

  const chatActions = useMemo(
    () => ({
      moveChat: (chat: ChatListItem) => {
        setSelectedChat(chat)
        setActivePopup('move-chat')
      },

      deleteChat: (chat: ChatListItem) => {
        setSelectedChat(chat)
        setActivePopup('delete-chat')
      },
    }),
    []
  )

  const createFolderButton = (
    <button
      type="button"
      title="Create Folder"
      className="flex items-center cursor-pointer"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setActivePopup('folder-form')
      }}
    >
      <AddFolderSvg className="opacity-80 hover:opacity-100" />
    </button>
  )

  if (isChatsLoading) return <Spinner inline className="mx-auto" />

  return (
    <div className="flex flex-col w-full grow min-h-0">
      <ChatSidebarAccordion
        title="Chats"
        isExpanded={activeSection === 'chats'}
        onToggle={() => handleToggleSection('chats')}
      >
        <ChatList chatActions={chatActions} chats={defaultChats} currentChatId={currentChat?.id} />
      </ChatSidebarAccordion>

      <ChatSidebarAccordion
        title="Folders"
        isExpanded={activeSection === 'folders'}
        headerContentTemplate={createFolderButton}
        onToggle={() => handleToggleSection('folders')}
      >
        <FolderList
          folders={folders}
          chatActions={chatActions}
          foldersToChatsMap={foldersToChatsMap}
          activeFolderIndex={activeFolderIndex}
          currentChatId={currentChat?.id}
          setActiveFolder={setActiveFolder}
        />
      </ChatSidebarAccordion>

      <DeleteChatPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'delete-chat'}
        selectedChat={selectedChat}
      />

      <MoveChatPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'move-chat'}
        selectedChat={selectedChat}
        onMove={handleMoveChat}
      />

      <FolderFormPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'folder-form'}
        onCreate={handleCreateFolder}
      />
    </div>
  )
}

export default ChatSidebarLists
