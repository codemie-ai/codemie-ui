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

import { ChatSidebarLocation } from './chatSidebarListsHelpers'
import { expandSectionForLocation } from './chatSidebarSectionsHelpers'

type PrimarySection = 'pinned' | 'recent' | 'workflow-runs' | 'folders'

interface UseChatSidebarExpansionParams {
  currentChat?: ChatListItem
  chatLocations: Record<string, ChatSidebarLocation>
  isChatsLoading: boolean
  isFocused: boolean
  setIsPinnedExpanded: (expanded: boolean | ((value: boolean) => boolean)) => void
}

export const useChatSidebarExpansion = ({
  currentChat,
  chatLocations,
  isChatsLoading,
  isFocused,
  setIsPinnedExpanded,
}: UseChatSidebarExpansionParams) => {
  const [isRecentExpanded, setIsRecentExpanded] = useState(true)
  const [isWorkflowRunsExpanded, setIsWorkflowRunsExpanded] = useState(true)
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(false)
  const [hasManuallyExpandedSection, setHasManuallyExpandedSection] = useState(false)
  const hasInitializedUnifiedViewRef = useRef(false)
  const previousIsFocusedRef = useRef(isFocused)

  const handleToggleSection = useCallback(
    (name: PrimarySection) => {
      setHasManuallyExpandedSection(true)
      if (name === 'pinned') {
        setIsPinnedExpanded((value) => !value)
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

  useEffect(() => {
    const enteredUnifiedView = previousIsFocusedRef.current && !isFocused
    previousIsFocusedRef.current = isFocused
    if (isFocused) return
    if (!hasInitializedUnifiedViewRef.current || enteredUnifiedView) {
      hasInitializedUnifiedViewRef.current = true
      setIsRecentExpanded(true)
      setIsWorkflowRunsExpanded(false)
      setIsFoldersExpanded(false)
      return
    }
    if (isFoldersExpanded) return
    if (currentChat && (!hasManuallyExpandedSection || isChatsLoading)) {
      expandSectionForLocation(chatLocations[currentChat.id], {
        setPinned: setIsPinnedExpanded,
        setRecent: setIsRecentExpanded,
        setWorkflowRuns: setIsWorkflowRunsExpanded,
        setFolders: setIsFoldersExpanded,
      })
    }
  }, [
    chatLocations,
    currentChat?.id,
    currentChat?.pinned,
    hasManuallyExpandedSection,
    isChatsLoading,
    isFocused,
    isFoldersExpanded,
    setIsPinnedExpanded,
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
