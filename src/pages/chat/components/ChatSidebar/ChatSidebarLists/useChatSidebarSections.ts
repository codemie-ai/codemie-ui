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

import { useCallback, useEffect, useState } from 'react'

import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

import { ChatSidebarLocation, customFolderKey } from './chatSidebarListsHelpers'
import { FocusedNavigationSection } from './chatSidebarSectionsHelpers'
import { useChatSidebarExpansion } from './useChatSidebarExpansion'
import { useChatSidebarFolders } from './useChatSidebarFolders'
import { ChatSidebarListsRef, useChatSidebarNavigation } from './useChatSidebarNavigation'
import { useChatSidebarPagination } from './useChatSidebarPagination'

import type { FocusedChatSidebarViewModel } from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'
import type { ForwardedRef } from 'react'

export type { ChatSidebarListsRef }

interface UseChatSidebarSectionsParams {
  ref: ForwardedRef<ChatSidebarListsRef>
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  chatLocations: Record<string, ChatSidebarLocation>
  chatFolders: readonly FolderListItem[]
  foldersToChatsMap: Record<string, ChatListItem[]>
  folderLabels: Record<string, string>
  currentChat: ChatListItem | undefined
  isChatsLoading: boolean
  isFocused: boolean
  focusedViewModel: FocusedChatSidebarViewModel
  setFocusedView: (view: FocusedView) => void
  setFocusedNavigationSection: (section: FocusedNavigationSection | null) => void
  requestExpandFocusedFolders: () => void
}

export const useChatSidebarSections = (params: UseChatSidebarSectionsParams) => {
  const {
    ref,
    pinnedChats,
    recentChats,
    workflowChats,
    chatLocations,
    chatFolders,
    foldersToChatsMap,
    folderLabels,
    currentChat,
    isChatsLoading,
    isFocused,
    focusedViewModel,
    setFocusedView,
    setFocusedNavigationSection,
    requestExpandFocusedFolders,
  } = params

  const [disableAccordionAnimation, setDisableAccordionAnimation] = useState(false)
  const { folders, folderKinds, activeFolderIndices, setActiveFolder, setActiveFolders } =
    useChatSidebarFolders({ chatFolders, foldersToChatsMap })
  const {
    isPinnedExpanded,
    setIsPinnedExpanded,
    revealPinnedChat,
    revealRecentChat,
    revealWorkflowRun,
    visiblePinnedChats,
    loadMorePinnedChats,
    hasPinnedScrollIntent,
    setHasPinnedScrollIntent,
    visibleRecentChats,
    loadMoreRecentChats,
    hasRecentScrollIntent,
    setHasRecentScrollIntent,
    visibleWorkflowRuns,
    loadMoreWorkflowRuns,
    hasWorkflowRunsScrollIntent,
    setHasWorkflowRunsScrollIntent,
    resetRecentChats,
  } = useChatSidebarPagination({
    pinnedChats,
    recentChats,
    workflowChats,
    currentChat,
    isChatsLoading,
  })
  const {
    isRecentExpanded,
    setIsRecentExpanded,
    isWorkflowRunsExpanded,
    setIsWorkflowRunsExpanded,
    isFoldersExpanded,
    setIsFoldersExpanded,
    handleToggleSection,
    markSectionManuallyExpanded,
  } = useChatSidebarExpansion({
    currentChat,
    chatLocations,
    isChatsLoading,
    isFocused,
    setIsPinnedExpanded,
  })
  useEffect(() => {
    if (!isRecentExpanded) resetRecentChats()
  }, [isRecentExpanded, resetRecentChats])

  const { registerChatElement, registerFolderElement } = useChatSidebarNavigation({
    ref,
    isFocused,
    focusedViewModel,
    chatLocations,
    setFocusedView,
    setFocusedNavigationSection,
    setRecentExpanded: setIsRecentExpanded,
    setWorkflowRunsExpanded: setIsWorkflowRunsExpanded,
    setFoldersExpanded: setIsFoldersExpanded,
    setActiveFolder,
    setDisableAccordionAnimation,
    revealPinnedChat,
    revealRecentChat,
    revealWorkflowRun,
  })

  const handleMoveChat = useCallback(
    (folderName: string, selectedChat?: ChatListItem) => {
      if (!selectedChat || currentChat?.id !== selectedChat.id) return
      if (isFocused) {
        setFocusedView(
          folderName === DEFAULT_CHAT_FOLDER
            ? { type: 'root' }
            : { type: 'folder', name: folderName }
        )
        return
      }
      markSectionManuallyExpanded()
      setIsRecentExpanded(false)
      setIsWorkflowRunsExpanded(false)
      setIsFoldersExpanded(true)
      if (folderName !== DEFAULT_CHAT_FOLDER) setActiveFolder(customFolderKey(folderName))
    },
    [currentChat?.id, isFocused, markSectionManuallyExpanded, setFocusedView]
  )

  const handleCreateFolder = useCallback(() => {
    markSectionManuallyExpanded()
    setIsRecentExpanded(false)
    setIsWorkflowRunsExpanded(false)
    setIsFoldersExpanded(true)
    setActiveFolder(null)
    requestExpandFocusedFolders()
  }, [markSectionManuallyExpanded, requestExpandFocusedFolders, setActiveFolder])

  return {
    isPinnedExpanded,
    setIsPinnedExpanded,
    isRecentExpanded,
    isWorkflowRunsExpanded,
    isFoldersExpanded,
    setActiveFolder,
    setActiveFolders,
    disableAccordionAnimation,
    visiblePinnedChats,
    loadMorePinnedChats,
    hasPinnedScrollIntent,
    setHasPinnedScrollIntent,
    visibleRecentChats,
    loadMoreRecentChats,
    hasRecentScrollIntent,
    setHasRecentScrollIntent,
    visibleWorkflowRuns,
    loadMoreWorkflowRuns,
    hasWorkflowRunsScrollIntent,
    setHasWorkflowRunsScrollIntent,
    folders,
    folderLabels,
    folderKinds,
    activeFolderIndices,
    registerChatElement,
    registerFolderElement,
    handleToggleSection,
    handleMoveChat,
    handleCreateFolder,
  }
}
