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

import React, { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import { AvatarType } from '@/constants/avatar'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'

import ChatHistory from './components/ChatHistory/ChatHistory'
import { ChatContext, ChatContextValue } from './hooks/useChatContext'

const SharedChatPage: React.FC = () => {
  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore)
  const token = router.currentRoute.value.params.token as string

  useEffect(() => {
    if (token) {
      chatsStore.getSharedChat(token)
    }

    return () => {
      chatsStore.clearCurrentChat()
    }
  }, [token])

  const handleAssistantClick = (id: string) => {
    router.push({
      name: 'assistant',
      params: { id },
    })
  }

  const chatContextValue = useMemo(
    () =>
      ({
        openConfigForm: (assistantId) => handleAssistantClick(assistantId),
        isSharedPage: true,
      } as ChatContextValue),
    []
  )

  const renderHeader = (
    <div className="mx-6 flex sticky top-0 items-center justify-start w-full gap-2">
      {!!currentChat?.assistantData?.length && (
        <>
          {currentChat.assistantData.slice(0, 3).map((assistant) => (
            <Avatar
              key={assistant.id}
              type={AvatarType.SMALL}
              iconUrl={assistant.iconUrl}
              name={assistant.name}
              onClick={() => handleAssistantClick(assistant.id)}
            />
          ))}
          {currentChat.assistantData.length > 3 && <div className="mr-2">...</div>}
          <div className="ml-1 mr-3">|</div>
        </>
      )}
      <div className="flex items-center justify-between w-full">
        <h1 className="text-xl font-semibold">Shared Conversation</h1>
        <div className="text-sm text-text-primary font-semibold">Read-only view</div>
      </div>
    </div>
  )

  return (
    <PageLayout renderHeader={renderHeader} childrenClassName="px-0">
      {currentChat && (
        <div className="flex flex-col h-full">
          <ChatContext.Provider value={chatContextValue}>
            <ChatHistory key={currentChat.id} />
          </ChatContext.Provider>
        </div>
      )}
    </PageLayout>
  )
}

export default SharedChatPage
