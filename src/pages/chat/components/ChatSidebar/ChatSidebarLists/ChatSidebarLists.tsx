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

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import AddFolderSvg from '@/assets/icons/folder-add.svg?react'
import Spinner from '@/components/Spinner'
import { getChatImportSource } from '@/constants/chatImportSources'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import { getValidDateTimestamp } from './chatSidebarListsHelpers'
import ChatList from '../ChatList/ChatList'
import DeleteChatPopup from '../ChatList/DeleteChatPopup'
import MoveChatPopup from '../ChatList/MoveChatPopup'
import RemoveChatFromFolderPopup from '../ChatList/RemoveChatFromFolderPopup'
import FolderFormPopup from '../FolderList/FolderFormPopup'
import FolderList from '../FolderList/FolderList'

const PINNED_CHATS_BATCH_SIZE = 5
const RECENT_CHATS_BATCH_SIZE = 20

type PopupName = 'delete-chat' | 'folder-form' | 'move-chat' | 'remove-chat-from-folder'

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
  const [visiblePinnedChatsCount, setVisiblePinnedChatsCount] = useState(PINNED_CHATS_BATCH_SIZE)
  const [visibleRecentChatsCount, setVisibleRecentChatsCount] = useState(RECENT_CHATS_BATCH_SIZE)
  const [hasPinnedScrollIntent, setHasPinnedScrollIntent] = useState(false)
  const [hasRecentScrollIntent, setHasRecentScrollIntent] = useState(false)

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
          const pinnedChatIndex = (chats as ChatListItem[])
            .filter((chat) => chat.pinned)
            .findIndex((chat) => chat.id === chatId)
          if (pinnedChatIndex >= 0) {
            setVisiblePinnedChatsCount((count) => Math.max(count, pinnedChatIndex + 1))
          }
          setIsPinnedExpanded(true)
        } else {
          const recentChatIndex = (chats as ChatListItem[])
            .filter((chat) => !chat.pinned && !getChatImportSource(chat.folder))
            .sort(
              (a, b) =>
                getValidDateTimestamp(b.updateDate, b.date) -
                getValidDateTimestamp(a.updateDate, a.date)
            )
            .findIndex((chat) => chat.id === chatId)
          if (recentChatIndex >= 0) {
            setVisibleRecentChatsCount((count) => Math.max(count, recentChatIndex + 1))
          }
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
      } else if (!getChatImportSource(chat.folder)) {
        recentChats.push(chat)
      }
    })
    recentChats.sort(
      (a, b) =>
        getValidDateTimestamp(b.updateDate, b.date) - getValidDateTimestamp(a.updateDate, a.date)
    )
    return { pinnedChats, recentChats }
  }, [chats])

  const loadMorePinnedChats = useCallback(() => {
    setVisiblePinnedChatsCount((count) =>
      Math.min(count + PINNED_CHATS_BATCH_SIZE, pinnedChats.length)
    )
  }, [pinnedChats.length])

  const loadMoreRecentChats = useCallback(() => {
    setVisibleRecentChatsCount((count) =>
      Math.min(count + RECENT_CHATS_BATCH_SIZE, recentChats.length)
    )
  }, [recentChats.length])

  const visiblePinnedChats = useMemo(
    () => pinnedChats.slice(0, visiblePinnedChatsCount),
    [pinnedChats, visiblePinnedChatsCount]
  )

  const visibleRecentChats = useMemo(
    () => recentChats.slice(0, visibleRecentChatsCount),
    [recentChats, visibleRecentChatsCount]
  )

  useEffect(() => {
    if (!currentChat?.pinned) return
    const currentChatIndex = pinnedChats.findIndex((chat) => chat.id === currentChat.id)
    if (currentChatIndex >= 0) {
      setVisiblePinnedChatsCount((count) => Math.max(count, currentChatIndex + 1))
    }
  }, [currentChat?.id, currentChat?.pinned, pinnedChats])

  useEffect(() => {
    if (!currentChat || currentChat.pinned || currentChat.folder) return
    const currentChatIndex = recentChats.findIndex((chat) => chat.id === currentChat.id)
    if (currentChatIndex >= 0) {
      setVisibleRecentChatsCount((count) => Math.max(count, currentChatIndex + 1))
    }
  }, [currentChat?.id, currentChat?.folder, currentChat?.pinned, recentChats])

  useEffect(() => {
    if (isChatsLoading) {
      setHasPinnedScrollIntent(false)
      setHasRecentScrollIntent(false)
    }
  }, [isChatsLoading])

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
      } else if (getChatImportSource(currentChat.folder)) {
        setIsRecentExpanded(false)
        setIsFoldersExpanded(true)
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

      removeChatFromFolder: (chat: ChatListItem) => {
        setSelectedChat(chat)
        setTimeout(() => setActivePopup('remove-chat-from-folder'), 0)
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
          onScrollIntent={() => setHasPinnedScrollIntent(true)}
          transitionOptions={disableAccordionAnimation ? { timeout: 0 } : undefined}
          contentClassName="max-h-[13.125rem]"
        >
          <ChatList
            chatActions={chatActions}
            chats={visiblePinnedChats}
            currentChatId={currentChat?.id}
            onLoadMore={loadMorePinnedChats}
            hasMore={visiblePinnedChats.length < pinnedChats.length}
            isLazyLoadingEnabled={isPinnedExpanded && hasPinnedScrollIntent}
          />
        </ChatSidebarAccordion>
      )}

      <ChatSidebarAccordion
        title="Recent"
        isExpanded={isRecentExpanded}
        onToggle={() => handleToggleSection('recent')}
        onScrollIntent={() => setHasRecentScrollIntent(true)}
        transitionOptions={disableAccordionAnimation ? { timeout: 0 } : undefined}
        groupId="chat-tree-group-chats"
        scrollable
      >
        <ChatList
          chatActions={chatActions}
          chats={visibleRecentChats}
          currentChatId={currentChat?.id}
          onLoadMore={loadMoreRecentChats}
          hasMore={visibleRecentChats.length < recentChats.length}
          isLazyLoadingEnabled={isRecentExpanded && hasRecentScrollIntent}
        />
      </ChatSidebarAccordion>

      <div className="my-2 border-t border-border-secondary shrink-0" />

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

      <RemoveChatFromFolderPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'remove-chat-from-folder'}
        selectedChat={selectedChat}
        onRemove={() => handleMoveChat(DEFAULT_CHAT_FOLDER)}
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
