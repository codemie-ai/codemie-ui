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

import { useState, useRef, useEffect } from 'react'

import Plus from '@/assets/icons/plus.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button/Button'
import Sidebar from '@/components/Sidebar/Sidebar'
import { assistantsStore } from '@/store/assistants'
import { workflowsStore } from '@/store/workflows'

import ChatSidebarLists, { ChatSidebarListsRef } from './ChatSidebarLists/ChatSidebarLists'
import StartNewChatModal from './StartNewChatModal'
import ChatSearchPanel from '../ChatSearchPanel/ChatSearchPanel'

const ChatSidebar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const sidebarListsRef = useRef<ChatSidebarListsRef>(null)

  useEffect(() => {
    assistantsStore.getRecentAssistants()
    workflowsStore.getRecentWorkflows()
  }, [])

  return (
    <Sidebar
      title="Chats"
      className="px-4"
      headerContent={
        <Button
          variant="primary"
          size="medium"
          onClick={() => setIsNewChatModalOpen(true)}
          data-onboarding="chat-new-chat-button"
          className="rounded-full"
        >
          <Plus />
          New Chat
        </Button>
      }
    >
      <div className="flex flex-col h-full">
        <div className="border-b border-border-secondary mb-2">
          <Button
            variant="tertiary"
            onClick={() => setIsSearchOpen(true)}
            className="w-full justify-start font-normal text-sm text-text-secondary !h-10 min-h-10 rounded-none"
          >
            <SearchIcon className="size-4 shrink-0" />
            Search in Chats
          </Button>
        </div>

        <ChatSearchPanel
          open={isSearchOpen}
          onOpenChange={setIsSearchOpen}
          sidebarListsRef={sidebarListsRef}
        />

        <ChatSidebarLists ref={sidebarListsRef} />
      </div>

      <StartNewChatModal
        isVisible={isNewChatModalOpen}
        onHide={() => setIsNewChatModalOpen(false)}
      />
    </Sidebar>
  )
}

export default ChatSidebar
