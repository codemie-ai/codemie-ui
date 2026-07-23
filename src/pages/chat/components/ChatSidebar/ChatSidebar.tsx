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

import { useState, useRef } from 'react'
import { useSnapshot } from 'valtio'

import ExploreSvg from '@/assets/icons/explore.svg?react'
import Plus from '@/assets/icons/plus.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button/Button'
import Sidebar from '@/components/Sidebar/Sidebar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'

import ChatSidebarAssistants from './ChatSidebarAssistants'
import ChatSidebarLists, { ChatSidebarListsRef } from './ChatSidebarLists/ChatSidebarLists'
import ChatSidebarWorkflows from './ChatSidebarWorkflows'
import ChatSearchPanel from '../ChatSearchPanel/ChatSearchPanel'

const ChatSidebar = () => {
  const router = useVueRouter()
  const { startNewChat } = useSnapshot(chatsStore)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const sidebarListsRef = useRef<ChatSidebarListsRef>(null)

  const handleCreateChat = async () => {
    await startNewChat('', '', false)
    router.push({ name: 'new-chat' })
  }

  const navigateToAssistants = () => {
    router.push({ name: 'assistants' })
  }

  const navigateToWorkflows = () => {
    router.push({ name: 'workflows' })
  }

  return (
    <Sidebar
      title="Chats"
      className="px-4"
      headerContent={
        <Button variant="primary" onClick={handleCreateChat} data-onboarding="chat-new-chat-button">
          <Plus />
          New Chat
        </Button>
      }
    >
      <div className="flex flex-col h-full">
        <div data-onboarding="chat-sidebar-recents">
          <ChatSidebarAssistants />

          <button
            onClick={navigateToAssistants}
            className="text-text-accent flex items-center gap-2 text-sm mt-3 ml-1.5"
          >
            <ExploreSvg />
            Explore Assistants
          </button>

          <div className="mt-6">
            <ChatSidebarWorkflows />
          </div>

          <button
            onClick={navigateToWorkflows}
            className="text-text-accent flex items-center gap-2 text-sm mt-3 ml-1.5"
          >
            <ExploreSvg />
            Explore Workflows
          </button>
        </div>

        <div className="h-px min-h-px bg-border-primary mt-7 mb-4" />

        <Button
          variant="tertiary"
          onClick={() => setIsSearchOpen(true)}
          className="mb-1 w-full flex items-center gap-2 justify-start font-normal font-sm !h-9 min-h-9"
        >
          <SearchIcon className="size-5" />
          Search in Chats
        </Button>

        <ChatSearchPanel
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          sidebarListsRef={sidebarListsRef}
        />

        <ChatSidebarLists ref={sidebarListsRef} />
      </div>
    </Sidebar>
  )
}

export default ChatSidebar
