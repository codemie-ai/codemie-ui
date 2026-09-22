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

import { useCallback, useImperativeHandle, useRef } from 'react'

import { ChatSidebarLocation, sidebarFolderKeyFromName } from './chatSidebarListsHelpers'
import {
  FocusedNavigationSection,
  getFocusedNavigationSection,
  getFocusedView,
} from './chatSidebarSectionsHelpers'

import type { FocusedChatSidebarViewModel } from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'
import type { RegisterChatElement } from '../ChatList/ChatListItem'
import type { ForwardedRef } from 'react'

export interface ChatSidebarListsRef {
  expandFolder: (folderName: string) => void
  openAssistantHistory: (
    assistantId: string,
    assistantName?: string,
    iconUrl?: string | null
  ) => void
  scrollToChat: (chatId: string, folderName?: string) => void
}

interface UseChatSidebarNavigationParams {
  ref: ForwardedRef<ChatSidebarListsRef>
  isFocused: boolean
  focusedViewModel: FocusedChatSidebarViewModel
  chatLocations: Record<string, ChatSidebarLocation>
  setFocusedView: (view: FocusedView) => void
  setFocusedNavigationSection: (section: FocusedNavigationSection | null) => void
  setRecentExpanded: (expanded: boolean) => void
  setWorkflowRunsExpanded: (expanded: boolean) => void
  setFoldersExpanded: (expanded: boolean) => void
  setActiveFolder: (folder: string | null) => void
  setDisableAccordionAnimation: (disabled: boolean) => void
  revealPinnedChat: (chatId: string) => void
  revealRecentChat: (chatId: string) => void
  revealWorkflowRun: (chatId: string) => void
}

export const useChatSidebarNavigation = ({
  ref,
  isFocused,
  focusedViewModel,
  chatLocations,
  setFocusedView,
  setFocusedNavigationSection,
  setRecentExpanded,
  setWorkflowRunsExpanded,
  setFoldersExpanded,
  setActiveFolder,
  setDisableAccordionAnimation,
  revealPinnedChat,
  revealRecentChat,
  revealWorkflowRun,
}: UseChatSidebarNavigationParams) => {
  const chatElementsRef = useRef(new Map<string, HTMLLIElement>())
  const folderElementsRef = useRef(new Map<string, HTMLDivElement>())

  const registerChatElement = useCallback<RegisterChatElement>((chatId, element) => {
    if (element) chatElementsRef.current.set(chatId, element)
    else chatElementsRef.current.delete(chatId)
  }, [])

  const registerFolderElement = useCallback(
    (folderName: string, element: HTMLDivElement | null) => {
      if (element) folderElementsRef.current.set(folderName, element)
      else folderElementsRef.current.delete(folderName)
    },
    []
  )

  const scrollAfterRender = useCallback(
    (
      getElement: () => HTMLElement | undefined,
      block: ScrollLogicalPosition,
      onComplete?: () => void
    ) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          getElement()?.scrollIntoView({ behavior: 'instant', block })
          onComplete?.()
        })
      })
    },
    []
  )

  useImperativeHandle(ref, () => ({
    expandFolder: (folderName: string) => {
      if (isFocused) {
        setFocusedView({ type: 'folder', name: folderName })
        return
      }
      const folderKey = sidebarFolderKeyFromName(folderName)
      setDisableAccordionAnimation(true)
      setRecentExpanded(false)
      setWorkflowRunsExpanded(false)
      setFoldersExpanded(true)
      setActiveFolder(folderKey)
      scrollAfterRender(
        () => folderElementsRef.current.get(folderKey),
        'center',
        () => setDisableAccordionAnimation(false)
      )
    },
    openAssistantHistory: (assistantId, assistantName, iconUrl) => {
      setFocusedNavigationSection(null)
      setFocusedView({ type: 'assistant', id: assistantId, name: assistantName, iconUrl })
    },
    scrollToChat: (chatId, folderName) => {
      if (isFocused) {
        const location = focusedViewModel.chatLocations[chatId]
        setFocusedNavigationSection(getFocusedNavigationSection(location))
        setFocusedView(getFocusedView(location, chatId))
        scrollAfterRender(
          () => chatElementsRef.current.get(chatId),
          'nearest',
          () => setFocusedNavigationSection(null)
        )
        return
      }

      setDisableAccordionAnimation(true)
      const location = chatLocations[chatId]
      let targetFolderName: string | undefined
      if (location?.section === 'folder') targetFolderName = location.folderName
      else if (folderName) targetFolderName = sidebarFolderKeyFromName(folderName)

      if (location?.section === 'workflow-runs') {
        revealWorkflowRun(chatId)
        setWorkflowRunsExpanded(true)
        setRecentExpanded(false)
        setFoldersExpanded(false)
      } else if (location?.section === 'pinned') {
        revealPinnedChat(chatId)
      } else if (targetFolderName) {
        setRecentExpanded(false)
        setWorkflowRunsExpanded(false)
        setFoldersExpanded(true)
        setActiveFolder(targetFolderName)
      } else if (location?.section === 'recent') {
        revealRecentChat(chatId)
        setRecentExpanded(true)
        setWorkflowRunsExpanded(false)
        setFoldersExpanded(false)
      }
      scrollAfterRender(
        () => chatElementsRef.current.get(chatId),
        'nearest',
        () => setDisableAccordionAnimation(false)
      )
    },
  }))

  return { registerChatElement, registerFolderElement }
}
