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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Panel } from 'react-resizable-panels'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import ResizableSeparator from '@/components/ResizableSeparator/ResizableSeparator'
import { useNewIntegrationPopup } from '@/hooks/useNewIntegrationPopup'
import { useVueRouter } from '@/hooks/useVueRouter'
import NewIntegrationPopup from '@/pages/integrations/components/NewIntegrationPopup'
import { chatsStore } from '@/store/chats'

import ChatConfigResizableSeparator from './components/ChatConfiguration/ChatConfigResizableSeparator'
import ChatConfiguration from './components/ChatConfiguration/ChatConfiguration'
import {
  CHAT_AREA_MIN_WIDTH,
  CHAT_CONFIG_MAX_WIDTH,
  CHAT_CONFIG_MIN_WIDTH,
} from './components/ChatConfiguration/chatConfigWidth'
import { useChatConfigResize } from './components/ChatConfiguration/useChatConfigResize'
import ChatHeader from './components/ChatHeader/ChatHeader'
import ChatHistory from './components/ChatHistory/ChatHistory'
import ChatPrompt from './components/ChatPrompt/ChatPrompt'
import ChatPromptStarters from './components/ChatPrompt/ChatPromptStarters'
import ChatResizableSeparator from './components/ChatResizableSeparator'
import ChatSidebar from './components/ChatSidebar/ChatSidebar'
import {
  CHAT_SIDEBAR_MAX_WIDTH,
  CHAT_SIDEBAR_MIN_WIDTH,
} from './components/ChatSidebar/chatSidebarWidth'
import { useChatSidebarResize } from './components/ChatSidebar/useChatSidebarResize'
import { useChatAuthCallbacks } from './hooks/useChatAuthCallbacks'
import { useChatConfiguration } from './hooks/useChatConfiguration'
import { ChatContext, ChatContextValue } from './hooks/useChatContext'
import { useChatInitialPrompt } from './hooks/useChatInitialPrompt'
import { useChatNavigation } from './hooks/useChatNavigation'
import { useChatPromptResize } from './hooks/useChatPromptResize'

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
  const { panelRef, initialWidth, handleResize } = useChatSidebarResize()

  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const chatId = router.currentRoute.value.params.id as string

  useEffect(() => {
    if (chatId) {
      chatsStore.getChat(chatId, { saveAsRecent: true })
      chatsStore.isNewChat = false
      chatsStore.newChatParams = null
    }
  }, [chatId])

  useChatAuthCallbacks(currentChat)

  const { defaultLayout, debouncedOnLayoutChanged, userId } = useChatPromptResize()
  const hasHistory = !!currentChat?.history.length

  const [starterPrompt, setStarterPrompt] = useState<string | null>(null)
  const handleStarterClick = useCallback((text: string) => setStarterPrompt(text), [])
  const clearStarterPrompt = useCallback(() => setStarterPrompt(null), [])

  const chatConfiguration = useChatConfiguration()
  const { panelRef: configPanelRef, handleResize: handleConfigResize } = useChatConfigResize({
    isConfigVisible: chatConfiguration.isConfigVisible,
    onClose: chatConfiguration.closeConfig,
    onOpen: chatConfiguration.toggleConfigVisibility,
  })
  const chatContextValue: ChatContextValue = useMemo(
    () => ({ ...chatConfiguration, isSharedPage: false }),
    [chatConfiguration]
  )

  return (
    <ChatContext.Provider value={chatContextValue}>
      <Group orientation="horizontal" className="h-full">
        <Panel
          id="chat-sidebar-panel"
          panelRef={panelRef}
          defaultSize={initialWidth}
          minSize={CHAT_SIDEBAR_MIN_WIDTH}
          maxSize={CHAT_SIDEBAR_MAX_WIDTH}
          collapsible
          collapsedSize={0}
          groupResizeBehavior="preserve-pixel-size"
          onResize={handleResize}
        >
          <ChatSidebar />
        </Panel>

        <ResizableSeparator orientation="horizontal" />

        <Panel id="chat-main-content" minSize={400}>
          <PageLayout key={currentChat?.id} childrenClassName="px-0" renderHeader={<ChatHeader />}>
            <Group orientation="horizontal" className="h-full">
              <Panel id="chat-area" minSize={CHAT_AREA_MIN_WIDTH}>
                {currentChat && (
                  <div className="flex flex-col h-full pb-7">
                    <Group
                      key={hasHistory ? userId : `empty-${userId}`}
                      orientation="vertical"
                      defaultLayout={defaultLayout}
                      onLayoutChanged={debouncedOnLayoutChanged}
                      className="flex-1 min-h-0"
                    >
                      <Panel id="chat-history" minSize={80}>
                        {hasHistory ? (
                          <ChatHistory />
                        ) : (
                          <div className="h-full flex flex-col">
                            <ChatPromptStarters onStarterClick={handleStarterClick} />
                          </div>
                        )}
                      </Panel>
                      <ChatResizableSeparator />
                      <Panel id="chat-prompt" defaultSize={130} minSize={130}>
                        <ChatPrompt
                          resizable
                          externalPrompt={starterPrompt}
                          onExternalPromptConsumed={clearStarterPrompt}
                        />
                      </Panel>
                    </Group>
                  </div>
                )}
              </Panel>

              <ChatConfigResizableSeparator />

              <Panel
                id="chat-config"
                panelRef={configPanelRef}
                defaultSize={0}
                minSize={CHAT_CONFIG_MIN_WIDTH}
                maxSize={CHAT_CONFIG_MAX_WIDTH}
                collapsible
                collapsedSize={0}
                groupResizeBehavior="preserve-pixel-size"
                onResize={handleConfigResize}
              >
                <ChatConfiguration showNewIntegrationPopup={showNewIntegrationPopup} />
              </Panel>
            </Group>
          </PageLayout>
        </Panel>
      </Group>

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
