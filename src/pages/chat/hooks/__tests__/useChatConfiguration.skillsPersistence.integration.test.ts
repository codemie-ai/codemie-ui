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

import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assistantsStore } from '@/store/assistants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import { userStore } from '@/store/user'
import type { ChatRequest } from '@/types/chatGeneration'

import { useChatConfiguration } from '../useChatConfiguration'

const fetchMock = vi.fn()

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  type: 'basic',
  json: () => Promise.resolve(body),
  clone: () => ({ json: () => Promise.resolve(body) }),
})

beforeEach(() => {
  localStorage.clear()
  userStore.user = { userId: 'user-1' } as typeof userStore.user
  chatsStore.chats = []
  chatsStore.currentChat = null
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
    const method = init?.method ?? 'GET'
    if (String(url).includes('v1/conversations/new')) {
      return Promise.resolve(
        jsonResponse({ id: '', history: [], is_workflow: false, llm_model: null })
      )
    }
    if (String(url).includes('v1/conversations') && method === 'POST') {
      return Promise.resolve(jsonResponse({ id: 'real-chat-1' }))
    }
    if (String(url).match(/v1\/conversations\/real-chat-1$/)) {
      return Promise.resolve(
        jsonResponse({
          id: 'real-chat-1',
          conversation_name: 'Real chat',
          history: [
            {
              historyIndex: 0,
              message: 'hi',
              date: new Date().toISOString(),
              executionId: null,
            },
            {
              historyIndex: 0,
              message: 'hello',
              date: new Date().toISOString(),
              executionId: null,
            },
          ],
          is_workflow: false,
          llm_model: null,
        })
      )
    }
    if (String(url).includes('v1/conversations/folders/list')) {
      return Promise.resolve(jsonResponse([]))
    }
    if (String(url).includes('v1/conversations') && method === 'GET') {
      // getChats() during an empty chat list — this is the un-awaited sweep call
      return Promise.resolve(jsonResponse([{ id: 'real-chat-1' }]))
    }
    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chat-skills persistence across a simulated Assistants navigation', () => {
  it('keeps selected skills for a first-ever chat despite the empty-chat-list sweep', async () => {
    await chatsStore.startNewChat()
    expect(chatsStore.currentChat?.id).toBe('')

    const { result, rerender, unmount } = renderHook(() => useChatConfiguration())

    const skill = { value: 'skill-a', label: 'Skill A' }
    result.current.setSelectedSkills([skill])
    expect(localStorage.getItem('user-1_chat-skills-')).not.toBeNull()

    await chatsStore.createChat()
    // createChat() triggers an un-awaited getChats() when chats.length was 0 at call time —
    // give its promise chain a tick to run before asserting the sentinel survived.
    await Promise.resolve()
    await Promise.resolve()

    rerender()

    expect(result.current.selectedSkills).toEqual([skill])
    expect(localStorage.getItem('user-1_chat-skills-')).toBeNull()
    expect(localStorage.getItem('user-1_chat-skills-real-chat-1')).toContain('skill-a')

    // Simulate navigating to Assistants and back: unmount and remount against the same chat.
    unmount()
    const { result: remounted } = renderHook(() => useChatConfiguration())

    expect(remounted.current.selectedSkills).toEqual([skill])

    // Send another message: the real send call sites (ChatPrompt.tsx, ChatUserMessage.tsx) map
    // selectedSkills -> skillIds via selectedSkills.map(s => s.value) and pass it into
    // createChatGeneration. _sendRequest is the one function that receives the fully-built
    // request payload (including skill_ids), so stub it to capture that payload without
    // mocking the whole streaming/fetch machinery.
    const sendRequestSpy = vi
      .spyOn(chatGenerationStore, '_sendRequest')
      .mockResolvedValue(undefined)
    const getAssistantSpy = vi
      .spyOn(assistantsStore, 'getAssistant')
      .mockResolvedValue({ id: 'assistant-1', tools: [] } as never)

    await chatGenerationStore.createChatGeneration({
      message: 'second message',
      assistantId: 'assistant-1',
      skillIds: remounted.current.selectedSkills.map((s) => s.value),
    })

    expect(sendRequestSpy).toHaveBeenCalledTimes(1)
    const sentData = sendRequestSpy.mock.calls[0][3] as ChatRequest
    expect(sentData.skill_ids).toEqual(['skill-a'])
    expect(sentData.skill_ids).not.toContain(null)
    expect(sentData.skill_ids).not.toContain(undefined)

    sendRequestSpy.mockRestore()
    getAssistantSpy.mockRestore()
  })
})
