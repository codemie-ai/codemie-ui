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

import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'

export const useChatInitialPrompt = () => {
  const router = useVueRouter()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentChat } = useSnapshot(chatsStore)
  const { defaultAssistant } = useSnapshot(assistantsStore)

  const chatId = router.currentRoute.value.params.id as string | undefined
  const queryPrompt = searchParams.get('prompt')

  useEffect(() => {
    if (queryPrompt && chatId && currentChat && currentChat.id === chatId) {
      const assistantId = currentChat.assistantIds?.[0] ?? defaultAssistant?.id

      setSearchParams(new URLSearchParams(), { replace: true })

      if (assistantId) {
        chatGenerationStore.createChatGeneration({
          message: queryPrompt,
          messageRaw: queryPrompt,
          files: [],
          assistantId,
          isWorkFlow: currentChat.isWorkflow,
        })
      }
    }
  }, [chatId, currentChat?.id, defaultAssistant, queryPrompt, setSearchParams])
}
