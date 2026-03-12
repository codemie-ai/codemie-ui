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

import { FC, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { chatsStore } from '@/store/chats'

import ChatConfiguration from './components/ChatConfiguration/ChatConfiguration'
import ChatHeader from './components/ChatHeader/ChatHeader'
import ChatHistory from './components/ChatHistory/ChatHistory'
import ChatPrompt from './components/ChatPrompt/ChatPrompt'
import ChatSidebar from './components/ChatSidebar/ChatSidebar'
import { useChatConfiguration } from './hooks/useChatConfiguration'
import { ChatContext, ChatContextValue } from './hooks/useChatContext'
import { useChatInitialPrompt } from './hooks/useChatInitialPrompt'
import { useChatNavigation } from './hooks/useChatNavigation'

const ChatPage: FC = () => {
  const {
    showNewIntegration,
    selectedCredentialType,
    selectedProject,
    showNewIntegrationPopup,
    hideNewIntegrationPopup,
    onIntegrationSuccess,
  } = useNewIntegrationPopup()
  useChatNavigation()
  useChatInitialPrompt()

  const router = useVueRouter()
  const { currentChat, getChat } = useSnapshot(chatsStore) as typeof chatsStore
  const chatId = router.currentRoute.value.params.id as string

  useEffect(() => {
    if (chatId) getChat(chatId)
  }, [chatId])

  const chatConfiguration = useChatConfiguration()
  const chatContextValue: ChatContextValue = useMemo(
    () => ({ ...chatConfiguration, isSharedPage: false }),
    [chatConfiguration]
  )

  return (
    <ChatContext.Provider value={chatContextValue}>
      <div className="flex h-full">
        <ChatSidebar />

        <PageLayout key={currentChat?.id} childrenClassName="px-0" renderHeader={<ChatHeader />}>
          <div className="flex h-full">
            {currentChat && (
              <div className="flex flex-col items-center grow min-w-0 pb-4">
                {!!currentChat?.history.length && <ChatHistory />}
                <ChatPrompt />
              </div>
            )}
            <ChatConfiguration showNewIntegrationPopup={showNewIntegrationPopup} />
          </div>
        </PageLayout>
      </div>

      <NewIntegrationPopup
        visible={showNewIntegration}
        onHide={hideNewIntegrationPopup}
        onSuccess={onIntegrationSuccess}
        project={selectedProject}
        credentialType={selectedCredentialType}
      />
    </ChatContext.Provider>
  )
}

export default ChatPage
