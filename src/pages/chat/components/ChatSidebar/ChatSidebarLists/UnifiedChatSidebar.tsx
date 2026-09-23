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

import { FC, ReactNode } from 'react'

import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

import ChatSidebarAccordion from './ChatSidebarAccordion'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions } from '../ChatList/ChatListItem'
import FolderList from '../FolderList/FolderList'

import type { useChatSidebarSections } from './useChatSidebarSections'

interface UnifiedChatSidebarProps {
  pinnedChats: ChatListItem[]
  recentChats: ChatListItem[]
  workflowChats: ChatListItem[]
  foldersToChatsMap: Record<string, ChatListItem[]>
  folderLabels: Record<string, string>
  currentChatId: string | undefined
  density: ChatListDensity
  chatActions: ChatListItemActions
  createFolderButton: ReactNode
  onOpenAssistantHistory: (assistantId: string) => void
  sections: ReturnType<typeof useChatSidebarSections>
}

const UnifiedChatSidebar: FC<UnifiedChatSidebarProps> = ({
  pinnedChats,
  recentChats,
  workflowChats,
  foldersToChatsMap,
  folderLabels,
  currentChatId,
  density,
  chatActions,
  createFolderButton,
  onOpenAssistantHistory,
  sections,
}) => {
  const {
    isPinnedExpanded,
    isRecentExpanded,
    isWorkflowRunsExpanded,
    isFoldersExpanded,
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
    folderKinds,
    activeFolderIndices,
    registerChatElement,
    registerFolderElement,
    handleToggleSection,
  } = sections

  const transitionOptions = disableAccordionAnimation ? { timeout: 0 } : undefined

  return (
    <>
      {pinnedChats.length > 0 && (
        <ChatSidebarAccordion
          title="Pinned"
          isExpanded={isPinnedExpanded}
          onToggle={() => handleToggleSection('pinned')}
          onScrollIntent={() => setHasPinnedScrollIntent(true)}
          transitionOptions={transitionOptions}
          contentClassName="max-h-52"
        >
          <ChatList
            chatActions={chatActions}
            chats={visiblePinnedChats}
            currentChatId={currentChatId}
            onLoadMore={loadMorePinnedChats}
            hasMore={visiblePinnedChats.length < pinnedChats.length}
            isLazyLoadingEnabled={isPinnedExpanded && hasPinnedScrollIntent}
            density={density}
            registerChatElement={registerChatElement}
          />
        </ChatSidebarAccordion>
      )}

      <ChatSidebarAccordion
        className={pinnedChats.length > 0 ? 'mt-2' : undefined}
        title="Recent Chats"
        isExpanded={isRecentExpanded}
        onToggle={() => handleToggleSection('recent')}
        onScrollIntent={() => setHasRecentScrollIntent(true)}
        transitionOptions={transitionOptions}
        groupId="chat-tree-group-chats"
        scrollable
      >
        {recentChats.length > 0 ? (
          <ChatList
            chatActions={chatActions}
            chats={visibleRecentChats}
            currentChatId={currentChatId}
            onLoadMore={loadMoreRecentChats}
            hasMore={visibleRecentChats.length < recentChats.length}
            isLazyLoadingEnabled={isRecentExpanded && hasRecentScrollIntent}
            density={density}
            registerChatElement={registerChatElement}
          />
        ) : (
          <p className="px-2 py-2 text-xs text-text-tertiary">No recent chats</p>
        )}
      </ChatSidebarAccordion>

      {workflowChats.length > 0 && (
        <ChatSidebarAccordion
          title="Workflows"
          isExpanded={isWorkflowRunsExpanded}
          onToggle={() => handleToggleSection('workflow-runs')}
          onScrollIntent={() => setHasWorkflowRunsScrollIntent(true)}
          transitionOptions={transitionOptions}
          scrollable
        >
          <ChatList
            chatActions={chatActions}
            chats={visibleWorkflowRuns}
            currentChatId={currentChatId}
            onLoadMore={loadMoreWorkflowRuns}
            hasMore={visibleWorkflowRuns.length < workflowChats.length}
            isLazyLoadingEnabled={isWorkflowRunsExpanded && hasWorkflowRunsScrollIntent}
            density={density}
            registerChatElement={registerChatElement}
          />
        </ChatSidebarAccordion>
      )}

      <div className="my-2 border-t border-border-secondary shrink-0" />

      <div data-onboarding="chat-sidebar-folders" className="flex min-h-12 flex-col">
        <ChatSidebarAccordion
          title="Folders"
          isExpanded={isFoldersExpanded}
          headerContentTemplate={createFolderButton}
          onToggle={() => handleToggleSection('folders')}
          transitionOptions={transitionOptions}
          scrollable
        >
          <FolderList
            folders={folders}
            chatActions={chatActions}
            foldersToChatsMap={foldersToChatsMap}
            folderLabels={folderLabels}
            folderKinds={folderKinds}
            activeFolderIndices={activeFolderIndices}
            currentChatId={currentChatId}
            setActiveFolders={setActiveFolders}
            onOpenAssistantHistory={onOpenAssistantHistory}
            density={density}
            registerChatElement={registerChatElement}
            registerFolderElement={registerFolderElement}
          />
        </ChatSidebarAccordion>
      </div>
    </>
  )
}

export default UnifiedChatSidebar
