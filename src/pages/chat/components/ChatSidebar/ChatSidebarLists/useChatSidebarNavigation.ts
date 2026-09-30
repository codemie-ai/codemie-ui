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
import { getFolderChatListId } from '../ChatList/chatListVirtualization'

import type { FocusedChatSidebarViewModel } from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'
import type { RegisterChatElement } from '../ChatList/ChatListItem'
import type { ChatListScroller, RegisterChatListScroller } from '../ChatList/chatListVirtualization'
import type { ForwardedRef } from 'react'

// Runs each step in its own animation frame, after two frames for pending state to reach the DOM.
// A step may scroll a virtualized list; the rows it brings in are rendered by the next step.
const runInFrames = (steps: Array<() => void>) => {
  let index = 0
  const next = () => {
    const step = steps[index]
    index += 1
    if (!step) return
    step()
    requestAnimationFrame(next)
  }
  requestAnimationFrame(() => requestAnimationFrame(next))
}

const isVisibleInScrollParent = (element: HTMLElement) => {
  let parent = element.parentElement
  while (parent && !/(auto|scroll)/.test(getComputedStyle(parent).overflowY)) {
    parent = parent.parentElement
  }
  if (!parent) return true
  const rect = element.getBoundingClientRect()
  const parentRect = parent.getBoundingClientRect()
  return rect.top >= parentRect.top && rect.bottom <= parentRect.bottom
}

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
  revealPinnedChat: () => void
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
}: UseChatSidebarNavigationParams) => {
  const chatElementsRef = useRef(new Map<string, HTMLLIElement>())
  const folderElementsRef = useRef(new Map<string, HTMLDivElement>())
  const chatListScrollersRef = useRef(new Set<ChatListScroller>())

  const registerChatListScroller = useCallback<RegisterChatListScroller>((scroller) => {
    chatListScrollersRef.current.add(scroller)
    return () => {
      chatListScrollersRef.current.delete(scroller)
    }
  }, [])

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

  const scrollFolderIntoList = useCallback(
    (folderKey: string, align: 'start' | 'center') =>
      Array.from(chatListScrollersRef.current).some(
        (scroller) => scroller.scrollToFolder?.(folderKey, align) ?? false
      ),
    []
  )

  const scrollChatIntoList = useCallback(
    (chatId: string, align: 'auto' | 'center', listId?: string) =>
      Array.from(chatListScrollersRef.current).some(
        (scroller) =>
          (!listId || scroller.listId === listId) &&
          (scroller.scrollToChat?.(chatId, align) ?? false)
      ),
    []
  )

  // Reports whether the chat's row (or its folder, as a fallback) was found, so a caller (e.g.
  // useChatSidebarSections' revealedChatIdRef) can tell a real reveal from a no-op and retry.
  // A row already in view is left where it is.
  const revealChat = useCallback(
    (chatId: string, onComplete?: (found: boolean) => void) => {
      const location = isFocused ? focusedViewModel.chatLocations[chatId] : chatLocations[chatId]
      const folderKey = location?.section === 'folder' ? location.folderName : undefined
      // In Unified view a folder chat is also listed in Recent, so its row must be looked up
      // inside the folder's own list, not wherever it registered last.
      const folderListId = !isFocused && folderKey ? getFolderChatListId(folderKey) : undefined
      const getChatRow = () =>
        folderListId
          ? document
              .getElementById(folderListId)
              ?.querySelector<HTMLElement>(`[data-chat-id="${CSS.escape(chatId)}"]`) ?? undefined
          : chatElementsRef.current.get(chatId)
      const isRowInView = () => {
        const row = getChatRow()
        return !!row && isVisibleInScrollParent(row)
      }

      let isInView = false
      const steps: Array<() => void> = [
        () => {
          isInView = isRowInView()
          if (isInView) return
          // Unified view: the chat's folder goes to the top of the list first.
          if (folderListId && folderKey) scrollFolderIntoList(folderKey, 'start')
          else scrollChatIntoList(chatId, 'auto')
        },
      ]
      if (folderListId) {
        steps.push(() => {
          // Still out of view under its folder (deep in a long folder): center it.
          if (!isInView && !isRowInView()) scrollChatIntoList(chatId, 'center', folderListId)
        })
      }
      steps.push(() => {
        // The folder is the fallback when the chat's own row is not rendered. Lists outside a
        // scrolling sidebar section are not virtualized, so the target is scrolled directly.
        const target =
          getChatRow() ?? (folderKey ? folderElementsRef.current.get(folderKey) : undefined)
        if (target && !isVisibleInScrollParent(target)) {
          target.scrollIntoView({ behavior: 'instant', block: 'nearest' })
        }
        onComplete?.(Boolean(target))
      })
      runInFrames(steps)
    },
    [isFocused, focusedViewModel, chatLocations, scrollFolderIntoList, scrollChatIntoList]
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
      // Open only this folder: jumps from search used to add to the open folders, and repeated
      // jumps kept every visited folder with its chats rendered until the browser froze.
      setActiveFolder(null)
      setActiveFolder(folderKey)
      runInFrames([
        () => scrollFolderIntoList(folderKey, 'center'),
        () => {
          const folder = folderElementsRef.current.get(folderKey)
          if (folder && !isVisibleInScrollParent(folder)) {
            folder.scrollIntoView({ behavior: 'instant', block: 'center' })
          }
          setDisableAccordionAnimation(false)
        },
      ])
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
        revealChat(chatId, () => setFocusedNavigationSection(null))
        return
      }

      setDisableAccordionAnimation(true)
      const location = chatLocations[chatId]
      let targetFolderName: string | undefined
      if (location?.section === 'folder') targetFolderName = location.folderName
      else if (folderName) targetFolderName = sidebarFolderKeyFromName(folderName)

      if (location?.section === 'workflow-runs') {
        setWorkflowRunsExpanded(true)
        setRecentExpanded(false)
        setFoldersExpanded(false)
      } else if (location?.section === 'pinned') {
        revealPinnedChat()
      } else if (targetFolderName) {
        setRecentExpanded(false)
        setWorkflowRunsExpanded(false)
        setFoldersExpanded(true)
        // Open only the chat's folder, as in expandFolder above.
        setActiveFolder(null)
        setActiveFolder(targetFolderName)
      } else if (location?.section === 'recent') {
        setRecentExpanded(true)
        setWorkflowRunsExpanded(false)
        setFoldersExpanded(false)
      }
      revealChat(chatId, () => setDisableAccordionAnimation(false))
    },
  }))

  return { registerChatElement, registerFolderElement, registerChatListScroller, revealChat }
}
