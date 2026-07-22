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

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import AddFolderSvg from '@/assets/icons/folder-add.svg?react'
import Spinner from '@/components/Spinner'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import { getValidDateTimestamp } from './chatSidebarListsHelpers'
import ChatList from '../ChatList/ChatList'
import DeleteChatPopup from '../ChatList/DeleteChatPopup'
import MoveChatPopup from '../ChatList/MoveChatPopup'
import FolderFormPopup from '../FolderList/FolderFormPopup'
import FolderList from '../FolderList/FolderList'

type PopupName = 'delete-chat' | 'folder-form' | 'move-chat'

export interface ChatSidebarListsRef {
  expandFolder: (folderName: string) => void
  scrollToChat: (chatId: string, folderName?: string) => void
}

const ChatSidebarLists = forwardRef<ChatSidebarListsRef, object>((_props, ref) => {
  const { chats, currentChat, chatFolders, isChatsLoading } = useSnapshot(
    chatsStore
  ) as typeof chatsStore

  const [selectedChat, setSelectedChat] = useState<ChatListItem>()
  const [activePopup, setActivePopup] = useState<PopupName | null>(null)
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)
  const [isRecentExpanded, setIsRecentExpanded] = useState(true)
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [hasManuallyExpandedSection, setHasManuallyExpandedSection] = useState(false)
  const [disableAccordionAnimation, setDisableAccordionAnimation] = useState(false)

  useImperativeHandle(ref, () => ({
    expandFolder: (folderName: string) => {
      setDisableAccordionAnimation(true)
      setIsRecentExpanded(false)
      setIsFoldersExpanded(true)
      setActiveFolder(folderName)

      setTimeout(() => {
        const folderElement = document.querySelector(
          `[data-folder="${folderName}"]`
        ) as HTMLElement | null
        if (!folderElement) {
          setDisableAccordionAnimation(false)
          return
        }
        folderElement.scrollIntoView({ behavior: 'instant', block: 'center' })
        if (folderElement.getAttribute('data-folder-open') !== 'true') {
          folderElement.click()
        }
        setDisableAccordionAnimation(false)
      }, 50)
    },
    scrollToChat: (chatId: string, folderName?: string) => {
      setDisableAccordionAnimation(true)

      if (folderName) {
        setIsRecentExpanded(false)
        setIsFoldersExpanded(true)
        setActiveFolder(folderName)
      } else {
        const targetChat = (chats as ChatListItem[]).find((c) => c.id === chatId)
        if (targetChat?.pinned) {
          setIsPinnedExpanded(true)
        } else {
          setIsRecentExpanded(true)
          setIsFoldersExpanded(false)
        }
      }

      setTimeout(() => {
        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`)
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'instant', block: 'nearest' })
        }
        setDisableAccordionAnimation(false)
      }, 50)
    },
  }))

  const { pinnedChats, recentChats } = useMemo(() => {
    const pinnedChats: ChatListItem[] = []
    const recentChats: ChatListItem[] = []
    ;(chats as ChatListItem[]).forEach((chat) => {
      if (chat.pinned) {
        pinnedChats.push(chat)
      } else {
        recentChats.push(chat)
      }
    })
    recentChats.sort(
      (a, b) =>
        getValidDateTimestamp(b.updateDate, b.date) - getValidDateTimestamp(a.updateDate, a.date)
    )
    return { pinnedChats, recentChats }
  }, [chats])

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
      .sort((a, b) => getValidDateTimestamp(b.updateDate) - getValidDateTimestamp(a.updateDate))
      .map((folder) => folder.name)
  }, [chatFolders])

  const activeFolderIndex = useMemo(() => {
    const folderIndex = folders.findIndex((folder) => folder === activeFolder)
    return folderIndex === -1 ? null : folderIndex
  }, [activeFolder, JSON.stringify(folders)])

  const handleHidePopup = () => setActivePopup(null)

  const handleToggleSection = (name: 'pinned' | 'recent' | 'folders') => {
    setHasManuallyExpandedSection(true)
    if (name === 'pinned') setIsPinnedExpanded((prev) => !prev)
    else if (name === 'recent') {
      const shouldExpand = !isRecentExpanded
      setIsRecentExpanded(shouldExpand)
      if (shouldExpand) setIsFoldersExpanded(false)
    } else {
      const shouldExpand = !isFoldersExpanded
      setIsFoldersExpanded(shouldExpand)
      if (shouldExpand) setIsRecentExpanded(false)
    }
  }

  const handleMoveChat = (folderName: string) => {
    if (currentChat?.id === selectedChat?.id) {
      if (folderName === DEFAULT_CHAT_FOLDER) {
        setIsRecentExpanded(true)
        setIsFoldersExpanded(false)
      } else {
        setIsRecentExpanded(false)
        setIsFoldersExpanded(true)
        setActiveFolder(folderName)
      }
    }
  }

  const handleCreateFolder = () => {
    setIsRecentExpanded(false)
    setIsFoldersExpanded(true)
    setActiveFolder(null)
  }

  useEffect(() => {
    if (currentChat && (!hasManuallyExpandedSection || isChatsLoading)) {
      if (currentChat.pinned) {
        setIsPinnedExpanded(true)
      } else {
        setIsRecentExpanded(true)
        setIsFoldersExpanded(false)
      }
    }
    if (currentChat?.folder) setActiveFolder(currentChat.folder)
  }, [
    currentChat?.id,
    currentChat?.folder,
    currentChat?.pinned,
    isChatsLoading,
    hasManuallyExpandedSection,
  ])

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
      {pinnedChats.length > 0 && (
        <ChatSidebarAccordion
          title="Pinned"
          isExpanded={isPinnedExpanded}
          onToggle={() => handleToggleSection('pinned')}
          transitionOptions={disableAccordionAnimation ? { timeout: 0 } : undefined}
        >
          <ChatList chatActions={chatActions} chats={pinnedChats} currentChatId={currentChat?.id} />
        </ChatSidebarAccordion>
      )}

      <ChatSidebarAccordion
        title="Recent"
        isExpanded={isRecentExpanded}
        onToggle={() => handleToggleSection('recent')}
        transitionOptions={disableAccordionAnimation ? { timeout: 0 } : undefined}
        groupId="chat-tree-group-chats"
      >
        <ChatList chatActions={chatActions} chats={recentChats} currentChatId={currentChat?.id} />
      </ChatSidebarAccordion>

      <div className="my-2 border-t border-border-secondary" />

      <div data-onboarding="chat-sidebar-folders">
        <ChatSidebarAccordion
          title="Folders"
          isExpanded={isFoldersExpanded}
          headerContentTemplate={createFolderButton}
          onToggle={() => handleToggleSection('folders')}
          transitionOptions={disableAccordionAnimation ? { timeout: 0 } : undefined}
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
      </div>

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
})

export default ChatSidebarLists
