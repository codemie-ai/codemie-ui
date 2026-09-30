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

import { useCallback, useEffect, useRef, useState } from 'react'

import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { ChatListItem, FolderListItem } from '@/types/entity/conversation'

import { ChatSidebarLocation, customFolderKey } from './chatSidebarListsHelpers'
import { FocusedNavigationSection } from './chatSidebarSectionsHelpers'
import { useChatSidebarExpansion } from './useChatSidebarExpansion'
import { useChatSidebarFolders } from './useChatSidebarFolders'
import { ChatSidebarListsRef, useChatSidebarNavigation } from './useChatSidebarNavigation'
import {
  getPersistedSidebarSections,
  useResyncPersistedSidebarSections,
} from './useChatSidebarSectionPersistence'

import type { FocusedChatSidebarViewModel } from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'
import type { ForwardedRef } from 'react'

export type { ChatSidebarListsRef }

interface UseChatSidebarSectionsParams {
  ref: ForwardedRef<ChatSidebarListsRef>
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
  // A chat opened by clicking its sidebar row is already where the user is looking.
  const sidebarSelectedChatIdRef = useRef<string | undefined>(undefined)
  const markSidebarSelection = useCallback((chatId: string) => {
    sidebarSelectedChatIdRef.current = chatId
  }, [])
  const { folders, folderKinds, activeFolderIndices, setActiveFolder, setActiveFolders } =
    useChatSidebarFolders({ chatFolders, foldersToChatsMap })
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(
    () => getPersistedSidebarSections().pinnedExpanded
  )
  useResyncPersistedSidebarSections(
    useCallback(() => setIsPinnedExpanded(getPersistedSidebarSections().pinnedExpanded), [])
  )
  const revealPinnedChat = useCallback(() => setIsPinnedExpanded(true), [])
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
    sidebarSelectedChatIdRef,
    setActiveFolder,
    focusedViewModel,
    setFocusedView,
    setFocusedNavigationSection,
  })
  const { registerChatElement, registerFolderElement, registerChatListScroller, revealChat } =
    useChatSidebarNavigation({
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
    })

  // Reveals the resolved chat once per id, after T1/T2 above have applied the folder/drilldown
  // state for it — the double-RAF inside revealChat waits for that state to reach the DOM.
  // Locks in only once revealChat reports the element was actually found — if the chat's row
  // (or folder fallback) isn't registered yet, the ref stays unset so the next render (e.g. once
  // more chats/folders finish rendering) retries instead of skipping the reveal forever.
  // Keyed on the id, not the chat object: the object changes with every streamed message chunk.
  const currentChatId = currentChat?.id
  const revealedChatIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!currentChatId || revealedChatIdRef.current === currentChatId) return
    const chatId = currentChatId
    if (sidebarSelectedChatIdRef.current === chatId) {
      revealedChatIdRef.current = chatId
      // Consumed: arriving at this chat again later (e.g. via Back) should reveal it.
      sidebarSelectedChatIdRef.current = undefined
      return
    }
    // An accordion still animating open clips its content, so the scroll could not reach a row
    // deep inside the chat's folder.
    setDisableAccordionAnimation(true)
    revealChat(chatId, (found) => {
      if (found) revealedChatIdRef.current = chatId
      setDisableAccordionAnimation(false)
    })
  }, [currentChatId, revealChat])

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
    folders,
    folderLabels,
    folderKinds,
    activeFolderIndices,
    registerChatElement,
    registerFolderElement,
    registerChatListScroller,
    markSidebarSelection,
    handleToggleSection,
    handleMoveChat,
    handleCreateFolder,
  }
}
