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

import { FC, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { ChatListDensity } from '@/store/chatViewSettings'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import {
  createEmptyAssistantChat,
  getChatDisplayName,
  getFocusedViewKey,
} from './focusedChatSidebarHelpers'
import FocusedConversationSections from './FocusedConversationSections'
import FocusedGroupList from './FocusedGroupList'
import FocusedViewHeader from './FocusedViewHeader'
import {
  getPersistedSidebarSections,
  setPersistedSidebarSection,
  useResyncPersistedSidebarSections,
} from './useChatSidebarSectionPersistence'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions, RegisterChatElement } from '../ChatList/ChatListItem'

import type {
  FocusedChatSidebarAggregate,
  FocusedChatSidebarViewModel,
} from './chatSidebarListsHelpers'
import type { FocusedView } from './focusedChatSidebarHelpers'

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
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(
    () => getPersistedSidebarSections().pinnedExpanded
  )
  const [isRecentExpanded, setIsRecentExpanded] = useState(false)
  useResyncPersistedSidebarSections(
    useCallback(() => setIsPinnedExpanded(getPersistedSidebarSections().pinnedExpanded), [])
  )
  const [isWorkflowRunsExpanded, setIsWorkflowRunsExpanded] = useState(false)
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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

  // Shared by both the drilldown and root views' Pinned toggle, so a manual toggle persists
  // regardless of which view triggered it.
  const handleTogglePinned = () => {
    setIsPinnedExpanded((value) => {
      const shouldExpand = !value
      setPersistedSidebarSection({ pinnedExpanded: shouldExpand })
      return shouldExpand
    })
  }

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
            density={density}
            isPinnedExpanded={isPinnedExpanded}
            onTogglePinned={handleTogglePinned}
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
        density={density}
        isPinnedExpanded={isPinnedExpanded}
        isRecentCollapsible
        isRecentExpanded={isRecentExpanded}
        onTogglePinned={handleTogglePinned}
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
          scrollable
        >
          <ChatList
            chats={viewModel.workflowChats}
            chatActions={chatActions}
            currentChatId={currentChatId}
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
        scrollable
      >
        <FocusedGroupList
          groups={viewModel.groups}
          density={density}
          onViewChange={onViewChange}
          onNewChat={onNewChat}
        />
      </ChatSidebarAccordion>
    </div>
  )
}

export default FocusedChatSidebar
