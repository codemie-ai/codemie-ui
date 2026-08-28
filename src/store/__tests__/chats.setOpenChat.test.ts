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

import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { Conversation } from '@/types/entity/conversation'

import { chatsStore } from '../chats'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))
vi.mock('@/utils/api', () => ({
  default: { delete: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
const mockRouter = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('@/hooks/useVueRouter', () => ({
  router: mockRouter,
  useVueRouter: () => ({ ...mockRouter, currentRoute: { value: { params: {} } } }),
}))

const mockUserStore = vi.hoisted(() => ({ user: { userId: 'user-1' } }))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

const serverChatWithoutGate = (id: string): Conversation =>
  ({
    id,
    name: 'Helper assist',
    folder: '',
    history: [],
    assistantIds: [],
    assistantData: [],
    isWorkflow: false,
  } as unknown as Conversation)

beforeEach(() => {
  chatsStore.openedChatsHistory = []
  chatsStore.currentChat = null
})

describe('setOpenChat', () => {
  it('overwrites the in-memory chat with fresh server data when nothing is pending', () => {
    const existing = {
      id: 'chat-1',
      name: 'Stale',
      history: [[{ createdAt: '2026-04-29T00:00:00Z', response: 'old', inProgress: false }]],
    } as unknown as Conversation
    chatsStore.openedChatsHistory = [existing]

    chatsStore.setOpenChat(serverChatWithoutGate('chat-1'))

    // Idle chat with no pending turn: a refetch is allowed to replace history.
    expect(chatsStore.currentChat?.history).toEqual([])
  })

  it('preserves an un-persisted OAuth connect gate against a late server refetch', () => {
    // A first-turn `oauth_connect_required` result renders a gate whose fields are
    // client-only (never persisted). The turn is already finalized (inProgress:false),
    // so the streaming guard no longer applies — a late getChat must still not wipe it.
    const gateTurn = {
      createdAt: '2026-04-29T00:00:00Z',
      inProgress: false,
      gitlabAuthPrompt: { settingId: 's1', integrationName: 'Team GitLab' },
    }
    const existing = {
      id: 'chat-1',
      name: 'Helper assist',
      history: [[gateTurn]],
    } as unknown as Conversation
    chatsStore.openedChatsHistory = [existing]

    chatsStore.setOpenChat(serverChatWithoutGate('chat-1'))

    expect(chatsStore.currentChat).toBe(existing)
    expect(chatsStore.currentChat?.history[0][0]).toMatchObject({
      gitlabAuthPrompt: { settingId: 's1', integrationName: 'Team GitLab' },
    })
  })

  it('preserves an un-persisted MCP auth prompt against a late server refetch', () => {
    const gateTurn = {
      createdAt: '2026-04-29T00:00:00Z',
      inProgress: false,
      mcpAuthPromptRows: [{ mcp_config_id: 'mcp-1', status: 'authentication_required' }],
    }
    const existing = {
      id: 'chat-1',
      name: 'Helper assist',
      history: [[gateTurn]],
    } as unknown as Conversation
    chatsStore.openedChatsHistory = [existing]

    chatsStore.setOpenChat(serverChatWithoutGate('chat-1'))

    expect(chatsStore.currentChat).toBe(existing)
    expect(chatsStore.currentChat?.history[0][0]).toMatchObject({
      mcpAuthPromptRows: [{ mcp_config_id: 'mcp-1' }],
    })
  })
})
