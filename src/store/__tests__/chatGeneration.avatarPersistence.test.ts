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

/**
 * Tests for avatar persistence in the chat sidebar.
 *
 * These tests cover two layers:
 *  1. Store layer — does `_updateChatMetadata` keep `assistantIds` / `isGroup` correct
 *     in `chatsStore.chats` after adding or removing a second assistant?
 *  2. Resolution layer — does `resolveGroupChatAvatars` return real names/icons
 *     (not undefined → "?") for all assistants in a group chat?
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveChatAvatar, resolveGroupChatAvatars } from '@/pages/chat/hooks/useChatItemAvatar'
import type { Conversation, ChatMessage, ChatListItem } from '@/types/entity/conversation'

// ---------------------------------------------------------------------------
// Mocks — same pattern as chatGeneration.test.ts
// ---------------------------------------------------------------------------

const mockUpdateChatListItem = vi.fn()
const mockUpdateRecentAssistants = vi.fn()

const mockChatsStore = {
  chats: [] as ChatListItem[],
  currentChat: null as Conversation | null,
  updateChatListItem: (...args: unknown[]) => mockUpdateChatListItem(...args),
  updateChat: vi.fn(),
}

vi.mock('@/utils/api', () => ({
  ABORT_ERROR: 'AbortError',
  DEFAULT_ERROR_MESSAGE: 'Oops!',
  default: { stream: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    updateRecentAssistants: (...args: unknown[]) => mockUpdateRecentAssistants(...args),
    getAssistant: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    getExecutionStates: vi.fn(),
    updateWorkflowExecutionStateOutput: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/utils/helpers', () => ({ fileToBase64: vi.fn() }))
vi.mock('@/utils/storage', () => ({ default: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'u1' } } }))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMsg = (): ChatMessage => ({
  role: 'User',
  request: 'hello',
  requestRaw: 'hello',
  createdAt: new Date().toISOString(),
  inProgress: false,
  assistantId: 'a1',
  assistant: { id: 'a1', name: 'Assistant A1' },
  executionId: null,
})

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'chat-1',
  assistantIds: ['a1'],
  assistantData: [{ id: 'a1', name: 'Assistant A1' }],
  history: [[makeMsg()]],
  initialAssistantId: 'a1',
  isWorkflow: false,
  ...overrides,
})

const makeListItem = (overrides: Partial<ChatListItem> = {}): ChatListItem => ({
  id: 'chat-1',
  name: 'Chat 1',
  folder: '',
  pinned: false,
  date: '2026-01-01',
  assistantIds: ['a1'],
  initialAssistantId: 'a1',
  initialWorkflowId: null,
  isGroup: false,
  isWorkflow: false,
  iconUrl: null,
  assistantNames: ['Assistant A1'],
  ...overrides,
})

const makeAssistant = (id: string, name: string, iconUrl = '') => ({
  id,
  name,
  icon_url: iconUrl,
  context: [],
  tools: [],
  conversation_starters: [],
  nested_assistants: [],
  user_abilities: [],
})

const emptyStores = {
  assistants: [],
  recentAssistants: [],
  pinnedAssistants: [],
  workflows: [],
  recentWorkflows: [],
  chatWorkflows: [],
}

// ---------------------------------------------------------------------------
// Import store AFTER mocks are registered
// ---------------------------------------------------------------------------

const { chatGenerationStore } = await import('@/store/chatGeneration')

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockChatsStore.chats = []
  mockChatsStore.currentChat = null
})

// ── Layer 1: updateCurrentChatAssistants ──────────────────────────────────

describe('updateCurrentChatAssistants', () => {
  it('adds a second assistant to chat.assistantIds', () => {
    const chat = makeConversation({ assistantIds: ['a1'], history: [[makeMsg()], [makeMsg()]] })
    chatGenerationStore.updateCurrentChatAssistants(chat, makeAssistant('a2', 'Assistant A2'))

    expect(chat.assistantIds).toContain('a1')
    expect(chat.assistantIds).toContain('a2')
  })

  it('places the latest-responding assistant first (for avatar ordering)', () => {
    const chat = makeConversation({ assistantIds: ['a1'], history: [[makeMsg()], [makeMsg()]] })
    chatGenerationStore.updateCurrentChatAssistants(chat, makeAssistant('a2', 'Assistant A2'))

    expect(chat.assistantIds[0]).toBe('a2')
  })

  it('resets chat.assistantIds when history.length === 1 (first send)', () => {
    // This is the expected behaviour — the list store carries the full set
    const chat = makeConversation({ assistantIds: ['a1', 'a2'], history: [[makeMsg()]] })
    chatGenerationStore.updateCurrentChatAssistants(chat, makeAssistant('a1', 'Assistant A1'))

    // After reset + unshift, only a1 remains in the conversation object
    expect(chat.assistantIds).toEqual(['a1'])
  })
})

// ── Layer 2: _updateChatMetadata ──────────────────────────────────────────
// _updateChatMetadata now returns the ChatListItem update payload instead of
// calling updateChatListItem directly. The caller (createChatGeneration) applies
// it after a successful response.

describe('_updateChatMetadata — returns correct chat list item payload', () => {
  it('keeps isGroup: true when chat.history.length === 1 resets assistantIds', () => {
    mockChatsStore.chats = [makeListItem({ assistantIds: ['a1', 'a2'], isGroup: true })]

    const chat = makeConversation({
      assistantIds: ['a1', 'a2'],
      assistantData: [
        { id: 'a1', name: 'Assistant A1' },
        { id: 'a2', name: 'Assistant A2' },
      ],
      history: [[makeMsg()]],
    })
    const update = chatGenerationStore._updateChatMetadata(
      chat,
      makeAssistant('a1', 'Assistant A1')
    )

    expect(update).toMatchObject({
      isGroup: true,
      assistantIds: expect.arrayContaining(['a1', 'a2']),
    })
  })

  it('propagates assistantNames from chat.assistantData so avatars have names', () => {
    mockChatsStore.chats = [makeListItem({ assistantIds: ['a1', 'a2'], isGroup: true })]

    const chat = makeConversation({
      assistantIds: ['a1', 'a2'],
      assistantData: [
        { id: 'a1', name: 'Assistant A1' },
        { id: 'a2', name: 'AI/Run FAQ' },
      ],
      history: [[makeMsg()]],
    })
    const update = chatGenerationStore._updateChatMetadata(
      chat,
      makeAssistant('a1', 'Assistant A1')
    )

    expect(update).toMatchObject({
      assistantNames: expect.arrayContaining(['Assistant A1', 'AI/Run FAQ']),
    })
  })

  it('sets isGroup: true after a NEW second assistant responds', () => {
    mockChatsStore.chats = [makeListItem({ assistantIds: ['a1'], isGroup: false })]

    const chat = makeConversation({
      assistantIds: ['a1'],
      assistantData: [{ id: 'a1', name: 'Assistant A1' }],
      history: [[makeMsg()], [makeMsg()]],
    })
    const update = chatGenerationStore._updateChatMetadata(
      chat,
      makeAssistant('a2', 'Assistant A2')
    )

    expect(update).toMatchObject({
      isGroup: true,
      assistantIds: expect.arrayContaining(['a1', 'a2']),
      assistantNames: expect.arrayContaining(['Assistant A2']),
    })
  })

  it('does NOT set isGroup: true for a solo-assistant chat', () => {
    mockChatsStore.chats = [makeListItem({ assistantIds: ['a1'], isGroup: false })]

    const chat = makeConversation({
      assistantIds: ['a1'],
      assistantData: [{ id: 'a1', name: 'Assistant A1' }],
      history: [[makeMsg()]],
    })
    const update = chatGenerationStore._updateChatMetadata(
      chat,
      makeAssistant('a1', 'Assistant A1')
    )

    expect(update).toMatchObject({ isGroup: false })
  })

  it('does NOT call updateChatListItem directly (caller applies after response)', () => {
    mockChatsStore.chats = [makeListItem({ assistantIds: ['a1'], isGroup: false })]

    const chat = makeConversation({
      assistantIds: ['a1'],
      assistantData: [{ id: 'a1', name: 'Assistant A1' }],
      history: [[makeMsg()]],
    })
    chatGenerationStore._updateChatMetadata(chat, makeAssistant('a1', 'Assistant A1'))

    expect(mockUpdateChatListItem).not.toHaveBeenCalled()
  })
})

// ── Layer 3: resolveGroupChatAvatars ─────────────────────────────────────

describe('resolveGroupChatAvatars — avatar names must not be undefined', () => {
  const groupChatItem = makeListItem({
    assistantIds: ['a1', 'a2'],
    isGroup: true,
    initialAssistantId: 'a1',
    iconUrl: 'https://cdn/a1.png',
    assistantNames: ['Assistant A1'], // backend only provides initial assistant name
  })

  it('resolves both avatars when assistants are in the main store', () => {
    const stores = {
      ...emptyStores,
      assistants: [
        makeAssistant('a1', 'Assistant A1', 'https://cdn/a1.png'),
        makeAssistant('a2', 'Assistant A2', 'https://cdn/a2.png'),
      ],
    }

    const avatars = resolveGroupChatAvatars(groupChatItem, stores)

    expect(avatars).toHaveLength(2)
    expect(avatars[0].name).toBe('Assistant A1')
    expect(avatars[1].name).toBe('Assistant A2')
    expect(avatars.every((a) => a.name !== undefined)).toBe(true)
  })

  it('resolves second assistant from recentAssistants when not in main list', () => {
    const stores = {
      ...emptyStores,
      assistants: [makeAssistant('a1', 'Assistant A1', 'https://cdn/a1.png')],
      recentAssistants: [makeAssistant('a2', 'Assistant A2', 'https://cdn/a2.png')],
    }

    const avatars = resolveGroupChatAvatars(groupChatItem, stores)

    expect(avatars[1].name).toBe('Assistant A2')
    expect(avatars[1].iconUrl).toBe('https://cdn/a2.png')
  })

  it('resolves second assistant from pinnedAssistants when not in other stores', () => {
    const stores = {
      ...emptyStores,
      assistants: [makeAssistant('a1', 'Assistant A1', 'https://cdn/a1.png')],
      pinnedAssistants: [makeAssistant('a2', 'Pinned Assistant', 'https://cdn/a2-pinned.png')],
    }

    const avatars = resolveGroupChatAvatars(groupChatItem, stores)

    expect(avatars[1].name).toBe('Pinned Assistant')
    expect(avatars[1].iconUrl).toBe('https://cdn/a2-pinned.png')
  })

  it('falls back to chat.iconUrl for initial assistant when not in any store', () => {
    const avatars = resolveGroupChatAvatars(groupChatItem, emptyStores)

    // Initial assistant (a1) uses chat.iconUrl as fallback
    expect(avatars[0].iconUrl).toBe('https://cdn/a1.png')
    // Non-initial assistant (a2) has no fallback — name and icon are undefined
    expect(avatars[1].iconUrl).toBeNull()
    expect(avatars[1].name).toBeUndefined()
  })

  it('uses assistantNames[i] as name fallback when assistant not in any store', () => {
    const chatWithNames = makeListItem({
      ...groupChatItem,
      assistantNames: ['Assistant A1', 'Assistant A2 from list'],
    })
    const avatars = resolveGroupChatAvatars(chatWithNames, emptyStores)

    expect(avatars[0].name).toBe('Assistant A1')
    expect(avatars[1].name).toBe('Assistant A2 from list')
  })
})

// ── Layer 4: resolveChatAvatar — pinned assistant resolved for solo chat ──

describe('resolveChatAvatar — pinnedAssistants used as fallback', () => {
  it('resolves name/icon from pinnedAssistants when not in main or recent', () => {
    const chat = makeListItem({
      initialAssistantId: 'a1',
      iconUrl: null,
      assistantNames: [],
    })
    const stores = {
      ...emptyStores,
      pinnedAssistants: [makeAssistant('a1', 'Pinned A1', 'https://cdn/pinned.png')],
    }

    const result = resolveChatAvatar(chat, stores)

    expect(result.name).toBe('Pinned A1')
    expect(result.iconUrl).toBe('https://cdn/pinned.png')
  })
})
