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
import { useSnapshot } from 'valtio'

import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'

export const useChatNavigation = () => {
  const router = useVueRouter()
  const { isChatsLoading } = useSnapshot(chatsStore)

  const chatId = router.currentRoute.value.params.id as string | undefined

  useEffect(() => {
    if (isChatsLoading || chatId) return

    const determineTargetChat = (): string | null => {
      if (chatsStore.currentChat?.id) {
        return chatsStore.currentChat.id
      }

      const lastChatId = chatsStore.getLastChat()
      if (lastChatId && chatsStore.chats.find((c) => c.id === lastChatId)) {
        return lastChatId
      }

      if (chatsStore.chats.length > 0) {
        return chatsStore.chats[0].id
      }

      return null
    }

    const targetChatId = determineTargetChat()
    if (targetChatId && !chatId) {
      router.replace({ name: 'chats', params: { id: targetChatId } })
    } else if (targetChatId) {
      router.push({ name: 'chats', params: { id: targetChatId } })
    }
  }, [chatId, isChatsLoading])
}
