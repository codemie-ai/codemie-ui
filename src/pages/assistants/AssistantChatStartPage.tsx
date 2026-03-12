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

import React, { useEffect } from 'react'

import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'

const AssistantChatStartPage: React.FC = () => {
  const router = useVueRouter()
  const {
    currentRoute: { value: route },
  } = router

  const { slug } = route.params
  const { prompt } = route.query

  useEffect(() => {
    const startChat = async () => {
      if (!slug) return

      try {
        const assistant = await assistantsStore.getAssistantBySlug(slug as string)

        if (assistant.id) {
          const chat = await chatsStore.createChat(assistant.id, assistant.name, false)
          assistantsStore.updateRecentAssistants(assistant)

          router.replace({
            name: 'chats',
            params: { id: chat.id },
            query: prompt ? { prompt } : {},
          })
        }
      } catch (error) {
        console.error('Error starting chat:', error)
        router.replace({ name: 'assistants' })
      }
    }

    startChat()
  }, [slug, prompt, router])

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Spinner />
    </div>
  )
}

export default AssistantChatStartPage
