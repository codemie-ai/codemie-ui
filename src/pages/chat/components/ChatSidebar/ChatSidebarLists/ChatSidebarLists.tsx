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

import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Spinner from '@/components/Spinner'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatOrganizeMode, chatViewSettingsStore } from '@/store/chatViewSettings'
import { moveOrderStore } from '@/store/moveOrder'
import { pinOrderStore } from '@/store/pinOrder'
import { ChatListItem } from '@/types/entity/conversation'

import {
  buildFocusedChatSidebarViewModel,
  buildUnifiedChatSidebarViewModel,
  FocusedChatSidebarAggregate,
} from './chatSidebarListsHelpers'
import FocusedChatSidebar from './FocusedChatSidebar'
import { FocusedView } from './focusedChatSidebarHelpers'
import UnifiedChatSidebar from './UnifiedChatSidebar'
import { ChatSidebarListsRef, useChatSidebarSections } from './useChatSidebarSections'
import DeleteChatPopup from '../ChatList/DeleteChatPopup'
import MoveChatPopup from '../ChatList/MoveChatPopup'
import RemoveChatFromFolderPopup from '../ChatList/RemoveChatFromFolderPopup'
import FolderFormPopup from '../FolderList/FolderFormPopup'
import StartNewChatModal from '../StartNewChatModal'

export type { ChatSidebarListsRef }

type PopupName = 'delete-chat' | 'folder-form' | 'move-chat' | 'remove-chat-from-folder'
type FocusedNavigationSection = 'pinned' | 'workflow-runs'

interface ChatSidebarListsProps {
  onFocusedViewActiveChange?: (isActive: boolean) => void
}

const ChatSidebarLists = forwardRef<ChatSidebarListsRef, ChatSidebarListsProps>((props, ref) => {
  const { onFocusedViewActiveChange } = props
  const router = useVueRouter()
  const { chats, currentChat, chatFolders, assistantFolders, isChatsLoading } =
    useSnapshot(chatsStore)
  const { organizeBy, density, showRecentAssistants, showWorkflowRunsSeparately } =
    useSnapshot(chatViewSettingsStore)

  const [selectedChat, setSelectedChat] = useState<ChatListItem>()
  const [newChatFolder, setNewChatFolder] = useState<string>()
  const [activePopup, setActivePopup] = useState<PopupName | null>(null)
  const [focusedView, setFocusedView] = useState<FocusedView>({ type: 'root' })
  const [focusedNavigationSection, setFocusedNavigationSection] =
    useState<FocusedNavigationSection | null>(null)
  const [expandFocusedFoldersSignal, setExpandFocusedFoldersSignal] = useState(0)
  const requestExpandFocusedFolders = useCallback(
    () => setExpandFocusedFoldersSignal((signal) => signal + 1),
    []
  )

  const isFocused = organizeBy === ChatOrganizeMode.FOCUSED || focusedView.type !== 'root'

  const {
    pinnedChats,
    recentChats,
    workflowChats,
    foldersToChatsMap,
    folderLabels,
    chatLocations,
  } = useMemo(
    () =>
      buildUnifiedChatSidebarViewModel(
        chats as ChatListItem[],
        {
          showRecentAssistants,
          showWorkflowRunsSeparately,
        },
        assistantFolders,
        pinOrderStore.getPinOrder(),
        moveOrderStore.getMoveOrder()
      ),
    [assistantFolders, chats, showRecentAssistants, showWorkflowRunsSeparately]
  )

  const focusedViewModel = useMemo(() => {
    const viewModel = buildFocusedChatSidebarViewModel(
      chats as ChatListItem[],
      {
        showRecentAssistants,
        showWorkflowRunsSeparately,
      },
      assistantFolders,
      chatFolders
    )
    return viewModel
  }, [assistantFolders, chatFolders, chats, showRecentAssistants, showWorkflowRunsSeparately])

  useEffect(() => {
    onFocusedViewActiveChange?.(isFocused && focusedView.type !== 'root')
  }, [focusedView.type, isFocused, onFocusedViewActiveChange])

  const sections = useChatSidebarSections({
    ref,
    pinnedChats,
    recentChats,
    workflowChats,
    chatLocations,
    chatFolders,
    foldersToChatsMap,
    folderLabels,
    currentChat: currentChat as ChatListItem | undefined,
    isChatsLoading,
    isFocused,
    focusedViewModel,
    setFocusedView,
    setFocusedNavigationSection,
    requestExpandFocusedFolders,
  })

  const { handleMoveChat, handleCreateFolder, registerChatElement } = sections

  const handleHidePopup = () => setActivePopup(null)

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

  const handleFocusedNewChat = useCallback(
    async (aggregate: FocusedChatSidebarAggregate) => {
      if (aggregate.kind === 'folder') {
        const isImportFolder =
          aggregate.folderKind === 'import' || aggregate.folderKind === 'legacy-import'
        setNewChatFolder(isImportFolder ? '' : aggregate.name)
        return
      }
      try {
        await chatsStore.startNewChat(aggregate.id, '', false)
        router.push({ name: 'new-chat' })
      } catch (error) {
        console.error('[handleFocusedNewChat] failed to start chat:', error)
      }
    },
    [router]
  )

  const createFolderButton = (
    <button
      type="button"
      title="Create Folder"
      aria-label="Create Folder"
      className="rounded p-1 text-icon-secondary hover:text-icon-primary"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setActivePopup('folder-form')
      }}
    >
      <PlusSvg className="size-4" />
    </button>
  )

  if (isChatsLoading) return <Spinner inline className="mx-auto" />

  return (
    <div className="flex flex-col w-full grow min-h-0">
      {isFocused ? (
        <FocusedChatSidebar
          view={focusedView}
          viewModel={focusedViewModel}
          chatActions={chatActions}
          currentChatId={currentChat?.id}
          density={density}
          navigationSection={focusedNavigationSection}
          onViewChange={setFocusedView}
          onNewChat={handleFocusedNewChat}
          registerChatElement={registerChatElement}
          createFolderButton={createFolderButton}
          expandFoldersSignal={expandFocusedFoldersSignal}
        />
      ) : (
        <UnifiedChatSidebar
          pinnedChats={pinnedChats}
          recentChats={recentChats}
          workflowChats={workflowChats}
          foldersToChatsMap={foldersToChatsMap}
          folderLabels={folderLabels}
          currentChatId={currentChat?.id}
          density={density}
          chatActions={chatActions}
          createFolderButton={createFolderButton}
          onOpenAssistantHistory={(assistantId) =>
            setFocusedView({ type: 'assistant', id: assistantId })
          }
          sections={sections}
        />
      )}

      <DeleteChatPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'delete-chat'}
        selectedChat={selectedChat}
      />
      <MoveChatPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'move-chat'}
        selectedChat={selectedChat}
        onMove={(folderName) => handleMoveChat(folderName, selectedChat)}
      />
      <RemoveChatFromFolderPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'remove-chat-from-folder'}
        selectedChat={selectedChat}
        onRemove={() => handleMoveChat(DEFAULT_CHAT_FOLDER, selectedChat)}
      />
      <FolderFormPopup
        onHide={handleHidePopup}
        isVisible={activePopup === 'folder-form'}
        onCreate={handleCreateFolder}
      />
      <StartNewChatModal
        isVisible={newChatFolder !== undefined}
        folder={newChatFolder}
        onHide={() => setNewChatFolder(undefined)}
      />
    </div>
  )
})

export default ChatSidebarLists
