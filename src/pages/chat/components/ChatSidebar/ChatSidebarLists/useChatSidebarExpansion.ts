// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { useCallback, useEffect, useRef, useState } from 'react'

import { ChatListItem } from '@/types/entity/conversation'

import { FocusedChatSidebarViewModel, ChatSidebarLocation } from './chatSidebarListsHelpers'
import {
  expandSectionForLocation,
  FocusedNavigationSection,
  getFocusedNavigationSection,
  getFocusedView,
} from './chatSidebarSectionsHelpers'
import { setPersistedSidebarSection } from './useChatSidebarSectionPersistence'

import type { FocusedView } from './focusedChatSidebarHelpers'

type PrimarySection = 'pinned' | 'recent' | 'workflow-runs' | 'folders'

interface UseChatSidebarExpansionParams {
  currentChat?: ChatListItem
  chatLocations: Record<string, ChatSidebarLocation>
  isChatsLoading: boolean
  isFocused: boolean
  setIsPinnedExpanded: (expanded: boolean | ((value: boolean) => boolean)) => void
  sidebarSelectedChatIdRef: { readonly current: string | undefined }
  setActiveFolder: (folder: string | null) => void
  focusedViewModel: FocusedChatSidebarViewModel
  setFocusedView: (view: FocusedView) => void
  setFocusedNavigationSection: (section: FocusedNavigationSection | null) => void
}

export const useChatSidebarExpansion = ({
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
}: UseChatSidebarExpansionParams) => {
  const [isRecentExpanded, setIsRecentExpanded] = useState(false)
  const [isWorkflowRunsExpanded, setIsWorkflowRunsExpanded] = useState(true)
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true)
  const expandedForChatIdRef = useRef<string | undefined>(undefined)
  const [hasManuallyExpandedSection, setHasManuallyExpandedSection] = useState(false)
  const hasInitializedUnifiedViewRef = useRef(false)
  const hasInitializedFocusedViewRef = useRef(false)
  const previousIsFocusedRef = useRef(isFocused)
  const previousFocusedChatIdRef = useRef<string | undefined>(undefined)

  const handleToggleSection = useCallback(
    (name: PrimarySection) => {
      setHasManuallyExpandedSection(true)
      if (name === 'pinned') {
        // Functional updater: two synchronous toggles in the same tick must each flip the real
        // previous value, not the isPinnedExpanded value closed over when the render started.
        setIsPinnedExpanded((value) => {
          const shouldExpand = !value
          setPersistedSidebarSection({ pinnedExpanded: shouldExpand })
          return shouldExpand
        })
        return
      }
      if (name === 'recent') {
        const shouldExpand = !isRecentExpanded
        setIsRecentExpanded(shouldExpand)
        if (shouldExpand) {
          setIsWorkflowRunsExpanded(false)
          setIsFoldersExpanded(false)
        }
        return
      }
      if (name === 'workflow-runs') {
        const shouldExpand = !isWorkflowRunsExpanded
        setIsWorkflowRunsExpanded(shouldExpand)
        if (shouldExpand) {
          setIsRecentExpanded(false)
          setIsFoldersExpanded(false)
        }
        return
      }
      const shouldExpand = !isFoldersExpanded
      setIsFoldersExpanded(shouldExpand)
      if (shouldExpand) {
        setIsRecentExpanded(false)
        setIsWorkflowRunsExpanded(false)
      }
    },
    [isFoldersExpanded, isRecentExpanded, isWorkflowRunsExpanded, setIsPinnedExpanded]
  )

  // Resolves the focused-view drilldown for the current chat. Split out of the effect below so
  // that effect's cognitive complexity stays within the project's linter budget.
  const resolveFocusedViewDrilldown = (enteredFocusedView: boolean) => {
    if (enteredFocusedView) hasInitializedFocusedViewRef.current = false
    // A newly resolved chat (e.g. a page change that never toggles focused/unified mode) must
    // re-run the drilldown resolution rather than keep showing the previous chat's location.
    if (currentChat?.id !== previousFocusedChatIdRef.current) {
      hasInitializedFocusedViewRef.current = false
    }
    previousFocusedChatIdRef.current = currentChat?.id
    if (!currentChat || hasInitializedFocusedViewRef.current) return
    if (sidebarSelectedChatIdRef.current === currentChat.id) {
      hasInitializedFocusedViewRef.current = true
      return
    }
    const location = focusedViewModel.chatLocations[currentChat.id]
    // isChatsLoading is also false before the list fetch has even started, so an unresolved
    // location is not final: wait for it rather than lock the root view in for good.
    if (!location) return
    // Only lock once the full chats/folders list has finished loading — chatLocations can
    // resolve to the wrong (e.g. root) location while it is still being built from a partial
    // fetch, and locking on that result would never be retried afterward.
    if (!isChatsLoading) hasInitializedFocusedViewRef.current = true
    setFocusedNavigationSection(getFocusedNavigationSection(location))
    setFocusedView(getFocusedView(location, currentChat.id))
  }

  useEffect(() => {
    const enteredUnifiedView = previousIsFocusedRef.current && !isFocused
    const enteredFocusedView = !previousIsFocusedRef.current && isFocused
    previousIsFocusedRef.current = isFocused
    if (isFocused) {
      resolveFocusedViewDrilldown(enteredFocusedView)
      return
    }
    if (!hasInitializedUnifiedViewRef.current || enteredUnifiedView) {
      const isFirstInit = !hasInitializedUnifiedViewRef.current
      hasInitializedUnifiedViewRef.current = true
      setIsRecentExpanded(false)
      setIsWorkflowRunsExpanded(false)
      setIsFoldersExpanded(true)
      // The current chat can already be resolved on the first run (the sidebar mounted after it
      // loaded); no later dependency change would then open its folder, so fall through.
      if (!isFirstInit || !currentChat) return
    }
    if (!currentChat || expandedForChatIdRef.current === currentChat.id) return
    // Opened from its own sidebar row: expanding elsewhere would shift the list under the pointer.
    if (sidebarSelectedChatIdRef.current === currentChat.id) {
      expandedForChatIdRef.current = currentChat.id
      return
    }
    if (hasManuallyExpandedSection && !isChatsLoading) return
    const location = chatLocations[currentChat.id]
    if (!location) return
    // Once per chat, so later list updates do not reset folders the user opened since.
    if (!isChatsLoading) expandedForChatIdRef.current = currentChat.id
    expandSectionForLocation(location, {
      setRecent: setIsRecentExpanded,
      setWorkflowRuns: setIsWorkflowRunsExpanded,
      setFolders: setIsFoldersExpanded,
      setActiveFolder,
    })
  }, [
    chatLocations,
    currentChat?.id,
    currentChat?.pinned,
    focusedViewModel,
    hasManuallyExpandedSection,
    isChatsLoading,
    isFocused,
    setActiveFolder,
    setFocusedNavigationSection,
    setFocusedView,
  ])

  return {
    isRecentExpanded,
    setIsRecentExpanded,
    isWorkflowRunsExpanded,
    setIsWorkflowRunsExpanded,
    isFoldersExpanded,
    setIsFoldersExpanded,
    handleToggleSection,
    markSectionManuallyExpanded: () => setHasManuallyExpandedSection(true),
  }
}
