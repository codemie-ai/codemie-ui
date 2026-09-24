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

import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { ChatListDensity } from '@/store/chatViewSettings'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import FocusedAggregateRow from './FocusedAggregateRow'
import {
  createEmptyAssistantChat,
  getChatDisplayName,
  getFocusedViewKey,
} from './focusedChatSidebarHelpers'
import FocusedConversationSections from './FocusedConversationSections'
import FocusedViewHeader from './FocusedViewHeader'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions, RegisterChatElement } from '../ChatList/ChatListItem'

import type {
  FocusedChatSidebarAggregate,
  FocusedChatSidebarViewModel,
} from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'

const WORKFLOW_RUNS_BATCH_SIZE = 20
// Folder rows are heavy (menu, avatars, counters); rendering all of them at once froze expanding
// Folders for users with hundreds of folders, so they load in batches as the list scrolls.
const FOLDERS_BATCH_SIZE = 20

interface FocusedChatSidebarProps {
  view: FocusedView
  viewModel: FocusedChatSidebarViewModel
  chatActions: ChatListItemActions
  currentChatId?: string
  density: ChatListDensity
  navigationSection: 'pinned' | 'workflow-runs' | null
  onViewChange: (view: FocusedView) => void
  onNewChat: (aggregate: FocusedChatSidebarAggregate) => void
  registerChatElement: RegisterChatElement
  createFolderButton?: ReactNode
  expandFoldersSignal?: number
}

const FocusedChatSidebar: FC<FocusedChatSidebarProps> = ({
  view,
  viewModel,
  chatActions,
  currentChatId,
  density,
  navigationSection,
  onViewChange,
  onNewChat,
  registerChatElement,
  createFolderButton,
  expandFoldersSignal = 0,
}) => {
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true)
  const [isRecentExpanded, setIsRecentExpanded] = useState(true)
  const [isWorkflowRunsExpanded, setIsWorkflowRunsExpanded] = useState(true)
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleWorkflowRunsCount, setVisibleWorkflowRunsCount] = useState(WORKFLOW_RUNS_BATCH_SIZE)
  const [hasWorkflowRunsScrollIntent, setHasWorkflowRunsScrollIntent] = useState(false)
  const [visibleGroupsCount, setVisibleGroupsCount] = useState(FOLDERS_BATCH_SIZE)
  const [hasGroupsScrollIntent, setHasGroupsScrollIntent] = useState(false)

  const selectedViewKey = getFocusedViewKey(view)

  useEffect(() => {
    setSearchQuery('')
    if (selectedViewKey !== 'root') {
      setIsPinnedExpanded(true)
    }
  }, [selectedViewKey])

  useEffect(() => {
    if (!view.targetChatId || currentChatId !== view.targetChatId) return
    onViewChange({ ...view, targetChatId: undefined })
  }, [currentChatId, onViewChange, view])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) return
    setIsPinnedExpanded(true)
  }

  const lastExpandFoldersSignalRef = useRef(expandFoldersSignal)
  useEffect(() => {
    if (expandFoldersSignal === lastExpandFoldersSignalRef.current) return
    lastExpandFoldersSignalRef.current = expandFoldersSignal
    setIsGroupsExpanded(true)
    // Raised after creating a folder: a new empty folder sorts last, so show the whole list.
    setVisibleGroupsCount(Number.MAX_SAFE_INTEGER)
    setIsRecentExpanded(false)
    setIsWorkflowRunsExpanded(false)
  }, [expandFoldersSignal])

  useEffect(() => {
    if (navigationSection === 'pinned') {
      setIsPinnedExpanded(true)
    } else if (navigationSection === 'workflow-runs') {
      setIsWorkflowRunsExpanded(true)
    }
  }, [navigationSection])

  useEffect(() => {
    const targetChatId = view.targetChatId ?? currentChatId
    const currentWorkflowRunIndex = viewModel.workflowChats.findIndex(
      (chat) => chat.id === targetChatId
    )
    if (currentWorkflowRunIndex >= 0) {
      setVisibleWorkflowRunsCount((count) => Math.max(count, currentWorkflowRunIndex + 1))
    }
  }, [currentChatId, view.targetChatId, viewModel.workflowChats])

  const loadMoreWorkflowRuns = useCallback(() => {
    setVisibleWorkflowRunsCount((count) =>
      Math.min(count + WORKFLOW_RUNS_BATCH_SIZE, viewModel.workflowChats.length)
    )
  }, [viewModel.workflowChats.length])

  const visibleWorkflowRuns = useMemo(
    () => viewModel.workflowChats.slice(0, visibleWorkflowRunsCount),
    [viewModel.workflowChats, visibleWorkflowRunsCount]
  )

  useEffect(() => {
    if (isGroupsExpanded) return
    setVisibleGroupsCount(FOLDERS_BATCH_SIZE)
    setHasGroupsScrollIntent(false)
  }, [isGroupsExpanded])

  const loadMoreGroups = useCallback(() => {
    setVisibleGroupsCount((count) => Math.min(count + FOLDERS_BATCH_SIZE, viewModel.groups.length))
  }, [viewModel.groups.length])

  const visibleGroups = useMemo(
    () => viewModel.groups.slice(0, visibleGroupsCount),
    [viewModel.groups, visibleGroupsCount]
  )
  const hasMoreGroups = visibleGroups.length < viewModel.groups.length
  const groupsSentinelRef = useInfiniteScroll({
    enabled: isGroupsExpanded && hasGroupsScrollIntent,
    isLoading: false,
    hasMore: hasMoreGroups,
    onLoadMore: loadMoreGroups,
  })

  let selectedAggregate: FocusedChatSidebarAggregate | undefined
  if (view.type === 'assistant') {
    selectedAggregate = viewModel.groups.find(
      (group) => group.kind === 'assistant' && group.id === view.id
    )
    if (!selectedAggregate) {
      const history = [...(viewModel.assistantHistory.get(view.id) ?? [])]
      const latestChat = history[0] ?? createEmptyAssistantChat(view)
      selectedAggregate = {
        id: view.id,
        name: view.name ?? latestChat.assistantNames?.[0] ?? 'Assistant',
        chats: history,
        latestChat,
        kind: 'assistant',
      }
    }
  } else if (view.type === 'folder') {
    selectedAggregate = viewModel.groups.find(
      (group) => group.kind === 'folder' && group.name === view.name
    )
  }

  if (view.type !== 'root' && selectedAggregate) {
    const drilldownChats =
      view.type === 'assistant'
        ? viewModel.assistantHistory.get(view.id) ?? selectedAggregate.chats
        : selectedAggregate.chats
    const normalizedSearchQuery = searchQuery.trim().toLowerCase()
    const filteredChats = normalizedSearchQuery
      ? drilldownChats.filter((chat) =>
          getChatDisplayName(chat).toLowerCase().includes(normalizedSearchQuery)
        )
      : drilldownChats
    const selectedPinnedChats = filteredChats.filter((chat) => chat.pinned)
    const selectedRecentChats = filteredChats.filter((chat) => !chat.pinned)

    return (
      <div className="flex min-h-0 grow flex-col">
        <FocusedViewHeader
          aggregate={selectedAggregate}
          conversationCount={drilldownChats.length}
          searchQuery={searchQuery}
          onBack={() => onViewChange({ type: 'root' })}
          onNewChat={() => onNewChat(selectedAggregate)}
          onSearchChange={handleSearchChange}
        />

        <div className="flex min-h-0 grow flex-col overflow-y-auto">
          <FocusedConversationSections
            key={selectedViewKey}
            pinnedChats={selectedPinnedChats}
            recentChats={selectedRecentChats}
            chatActions={chatActions}
            currentChatId={currentChatId}
            revealChatId={view.targetChatId}
            density={density}
            isPinnedExpanded={isPinnedExpanded}
            onTogglePinned={() => setIsPinnedExpanded((value) => !value)}
            showRelativeTimestamp
            registerChatElement={registerChatElement}
          />
        </div>
      </div>
    )
  }

  const handleToggleWorkflowRuns = () => {
    const shouldExpand = !isWorkflowRunsExpanded
    setIsWorkflowRunsExpanded(shouldExpand)
    if (shouldExpand) {
      setIsRecentExpanded(false)
      setIsGroupsExpanded(false)
    }
  }
  const handleToggleRecent = () => {
    const shouldExpand = !isRecentExpanded
    setIsRecentExpanded(shouldExpand)
    if (shouldExpand) {
      setIsWorkflowRunsExpanded(false)
      setIsGroupsExpanded(false)
    }
  }
  const handleToggleGroups = () => {
    const shouldExpand = !isGroupsExpanded
    setIsGroupsExpanded(shouldExpand)
    if (shouldExpand) {
      setIsRecentExpanded(false)
      setIsWorkflowRunsExpanded(false)
    }
  }

  return (
    <div className="flex min-h-0 grow flex-col overflow-y-auto">
      <FocusedConversationSections
        pinnedChats={viewModel.pinnedChats}
        recentChats={viewModel.recentChats}
        chatActions={chatActions}
        currentChatId={currentChatId}
        revealChatId={view.targetChatId}
        density={density}
        isPinnedExpanded={isPinnedExpanded}
        isRecentCollapsible
        isRecentExpanded={isRecentExpanded}
        onTogglePinned={() => setIsPinnedExpanded((value) => !value)}
        onToggleRecent={handleToggleRecent}
        recentTitle="Recent Chats"
        showRecentWhenEmpty
        registerChatElement={registerChatElement}
      />

      {viewModel.workflowChats.length > 0 && (
        <ChatSidebarAccordion
          title="Workflows"
          count={viewModel.workflowChats.length}
          isExpanded={isWorkflowRunsExpanded}
          onToggle={handleToggleWorkflowRuns}
          onScrollIntent={() => setHasWorkflowRunsScrollIntent(true)}
          scrollable
        >
          <ChatList
            chats={visibleWorkflowRuns}
            chatActions={chatActions}
            currentChatId={currentChatId}
            onLoadMore={loadMoreWorkflowRuns}
            hasMore={visibleWorkflowRuns.length < viewModel.workflowChats.length}
            isLazyLoadingEnabled={isWorkflowRunsExpanded && hasWorkflowRunsScrollIntent}
            density={density}
            registerChatElement={registerChatElement}
          />
        </ChatSidebarAccordion>
      )}

      <ChatSidebarAccordion
        title="Folders"
        count={viewModel.groups.length}
        isExpanded={isGroupsExpanded}
        headerContentTemplate={createFolderButton}
        onToggle={handleToggleGroups}
        onScrollIntent={() => setHasGroupsScrollIntent(true)}
        scrollable
      >
        {visibleGroups.map((group) => (
          <FocusedAggregateRow
            key={`${group.kind}:${group.id}`}
            aggregate={group}
            density={density}
            onSelect={() =>
              onViewChange(
                group.kind === 'assistant'
                  ? {
                      type: 'assistant',
                      id: group.id,
                      name: group.name,
                      iconUrl: group.iconUrl,
                    }
                  : { type: 'folder', name: group.name }
              )
            }
            onNewChat={group.kind === 'assistant' ? () => onNewChat(group) : undefined}
          />
        ))}
        {hasMoreGroups && <div ref={groupsSentinelRef} aria-hidden="true" className="h-px" />}
      </ChatSidebarAccordion>
    </div>
  )
}

export default FocusedChatSidebar
