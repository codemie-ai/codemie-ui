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

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ChatListItem } from '@/types/entity/conversation'

const PINNED_CHATS_BATCH_SIZE = 5
const RECENT_CHATS_BATCH_SIZE = 20
const WORKFLOW_RUNS_BATCH_SIZE = 20

interface UseChatSidebarPaginationParams {
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  currentChat?: ChatListItem
  isChatsLoading: boolean
}

export const useChatSidebarPagination = ({
  pinnedChats,
  recentChats,
  workflowChats,
  currentChat,
  isChatsLoading,
}: UseChatSidebarPaginationParams) => {
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)
  const [visiblePinnedChatsCount, setVisiblePinnedChatsCount] = useState(PINNED_CHATS_BATCH_SIZE)
  const [visibleRecentChatsCount, setVisibleRecentChatsCount] = useState(RECENT_CHATS_BATCH_SIZE)
  const [visibleWorkflowRunsCount, setVisibleWorkflowRunsCount] = useState(WORKFLOW_RUNS_BATCH_SIZE)
  const [hasPinnedScrollIntent, setHasPinnedScrollIntent] = useState(false)
  const [hasRecentScrollIntent, setHasRecentScrollIntent] = useState(false)
  const [hasWorkflowRunsScrollIntent, setHasWorkflowRunsScrollIntent] = useState(false)

  const revealPinnedChat = useCallback(
    (chatId: string) => {
      const pinnedChatIndex = pinnedChats.findIndex((chat) => chat.id === chatId)
      if (pinnedChatIndex >= 0) {
        setVisiblePinnedChatsCount((count) => Math.max(count, pinnedChatIndex + 1))
      }
      setIsPinnedExpanded(true)
    },
    [pinnedChats]
  )

  const revealRecentChat = useCallback(
    (chatId: string) => {
      const index = recentChats.findIndex((chat) => chat.id === chatId)
      if (index >= 0) setVisibleRecentChatsCount((count) => Math.max(count, index + 1))
    },
    [recentChats]
  )

  const revealWorkflowRun = useCallback(
    (chatId: string) => {
      const index = workflowChats.findIndex((chat) => chat.id === chatId)
      if (index >= 0) setVisibleWorkflowRunsCount((count) => Math.max(count, index + 1))
    },
    [workflowChats]
  )

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

  const loadMoreWorkflowRuns = useCallback(() => {
    setVisibleWorkflowRunsCount((count) =>
      Math.min(count + WORKFLOW_RUNS_BATCH_SIZE, workflowChats.length)
    )
  }, [workflowChats.length])

  const visiblePinnedChats = useMemo(
    () => pinnedChats.slice(0, visiblePinnedChatsCount),
    [pinnedChats, visiblePinnedChatsCount]
  )
  const visibleRecentChats = useMemo(
    () => recentChats.slice(0, visibleRecentChatsCount),
    [recentChats, visibleRecentChatsCount]
  )
  const visibleWorkflowRuns = useMemo(
    () => workflowChats.slice(0, visibleWorkflowRunsCount),
    [workflowChats, visibleWorkflowRunsCount]
  )

  useEffect(() => {
    if (!currentChat?.pinned) return
    revealPinnedChat(currentChat.id)
  }, [currentChat?.id, currentChat?.pinned, revealPinnedChat])

  useEffect(() => {
    if (!currentChat || currentChat.pinned) return
    revealRecentChat(currentChat.id)
  }, [currentChat, revealRecentChat])

  useEffect(() => {
    if (!currentChat) return
    revealWorkflowRun(currentChat.id)
  }, [currentChat, revealWorkflowRun])

  useEffect(() => {
    if (!isChatsLoading) return
    setHasPinnedScrollIntent(false)
    setHasRecentScrollIntent(false)
    setHasWorkflowRunsScrollIntent(false)
  }, [isChatsLoading])

  return {
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
  }
}
