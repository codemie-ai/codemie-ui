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

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ToolCallPolicy } from '@/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown'
import { Conversation } from '@/types/entity/conversation'

import { useToolPermissions } from '../useToolPermissions'

const { mockChatsStore, mockAssistantsStore, mockIsFeatureEnabled } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    isNewChat: false,
    updateChat: vi.fn(),
  },
  mockAssistantsStore: {
    defaultAssistant: undefined as { id: string } | undefined,
    getAssistant: vi.fn(),
  },
  mockIsFeatureEnabled: vi.fn(() => true),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store', () => ({ assistantsStore: mockAssistantsStore }))
vi.mock('@/utils/featureFlags', () => ({ isFeatureEnabled: mockIsFeatureEnabled }))

const chatWith = (id: string, overrides: Partial<Conversation> = {}): Conversation =>
  ({ id, history: [], ...overrides } as unknown as Conversation)

const assistantWith = (id: string, policy?: ToolCallPolicy, allowOverride?: boolean) => ({
  id,
  tool_permissions: { tool_call_policy: policy, allow_override: allowOverride },
})

beforeEach(() => {
  mockChatsStore.currentChat = null
  mockChatsStore.isNewChat = false
  mockChatsStore.updateChat = vi.fn()
  mockAssistantsStore.defaultAssistant = undefined
  mockAssistantsStore.getAssistant = vi.fn()
  mockIsFeatureEnabled.mockReturnValue(true)
})

describe('useToolPermissions', () => {
  it('is disabled and returns default state when isWorkflow is true', () => {
    const { result } = renderHook(() => useToolPermissions(true))

    expect(result.current.enabled).toBe(false)
    expect(result.current.policy).toBe(ToolCallPolicy.AUTO_APPROVE)
    expect(result.current.allowOverride).toBe(false)
    expect(result.current.loaded).toBe(true)
  })

  it('is disabled when the feature flag is off', () => {
    mockIsFeatureEnabled.mockReturnValue(false)

    const { result } = renderHook(() => useToolPermissions())

    expect(result.current.enabled).toBe(false)
    expect(result.current.policy).toBe(ToolCallPolicy.AUTO_APPROVE)
    expect(result.current.loaded).toBe(true)
  })

  it('returns default state when there are no attached or default assistants', async () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: [] })

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.AUTO_APPROVE)
    expect(result.current.allowOverride).toBe(false)
  })

  it('falls back to the default assistant when the chat has no assistantIds', async () => {
    mockChatsStore.currentChat = chatWith('', { assistantIds: [] })
    mockAssistantsStore.defaultAssistant = { id: 'default-1' }
    mockAssistantsStore.getAssistant.mockResolvedValue(
      assistantWith('default-1', ToolCallPolicy.APPROVE_FOR_ME, true)
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(mockAssistantsStore.getAssistant).toHaveBeenCalledWith('default-1')
    expect(result.current.policy).toBe(ToolCallPolicy.APPROVE_FOR_ME)
  })

  it('resolves the strictest policy across attached assistants', async () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: ['a1', 'a2'] })
    mockAssistantsStore.getAssistant.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'a1'
          ? assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
          : assistantWith('a2', ToolCallPolicy.ASK_FOR_APPROVAL, true)
      )
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.ASK_FOR_APPROVAL)
  })

  it('picks APPROVE_FOR_ME over AUTO_APPROVE when no ASK_FOR_APPROVAL is present', async () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: ['a1', 'a2'] })
    mockAssistantsStore.getAssistant.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'a1'
          ? assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
          : assistantWith('a2', ToolCallPolicy.APPROVE_FOR_ME, true)
      )
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.APPROVE_FOR_ME)
  })

  it('only allows override when every attached assistant allows it', async () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: ['a1', 'a2'] })
    mockAssistantsStore.getAssistant.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'a1'
          ? assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
          : assistantWith('a2', ToolCallPolicy.AUTO_APPROVE, false)
      )
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.allowOverride).toBe(false)
  })

  it('fails closed to ASK_FOR_APPROVAL when any assistant lookup fails', async () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: ['a1', 'a2'] })
    mockAssistantsStore.getAssistant.mockImplementation((id: string) =>
      id === 'a1'
        ? Promise.resolve(assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true))
        : Promise.reject(new Error('network error'))
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.ASK_FOR_APPROVAL)
    expect(result.current.allowOverride).toBe(false)
  })

  it('uses the conversation-level policy override when the assistant allows it', async () => {
    mockChatsStore.currentChat = chatWith('c1', {
      assistantIds: ['a1'],
      toolCallPolicy: ToolCallPolicy.APPROVE_FOR_ME,
    })
    mockAssistantsStore.getAssistant.mockResolvedValue(
      assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.APPROVE_FOR_ME)
  })

  it('ignores the conversation-level policy when the assistant does not allow override', async () => {
    mockChatsStore.currentChat = chatWith('c1', {
      assistantIds: ['a1'],
      toolCallPolicy: ToolCallPolicy.APPROVE_FOR_ME,
    })
    mockAssistantsStore.getAssistant.mockResolvedValue(
      assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, false)
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.AUTO_APPROVE)
  })

  it('ignores an invalid conversation-level policy value', async () => {
    mockChatsStore.currentChat = chatWith('c1', {
      assistantIds: ['a1'],
      toolCallPolicy: 'not_a_real_policy' as ToolCallPolicy,
    })
    mockAssistantsStore.getAssistant.mockResolvedValue(
      assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
    )

    const { result } = renderHook(() => useToolPermissions())

    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.policy).toBe(ToolCallPolicy.AUTO_APPROVE)
  })

  it('persists the policy via chatsStore.updateChat when a chat exists', () => {
    mockChatsStore.currentChat = chatWith('c1', { assistantIds: ['a1'] })
    mockAssistantsStore.getAssistant.mockResolvedValue(
      assistantWith('a1', ToolCallPolicy.AUTO_APPROVE, true)
    )

    const { result } = renderHook(() => useToolPermissions())
    result.current.setPolicy(ToolCallPolicy.ASK_FOR_APPROVAL)

    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('c1', {
      toolCallPolicy: ToolCallPolicy.ASK_FOR_APPROVAL,
    })
  })

  it('does not call updateChat when there is no current chat', () => {
    mockChatsStore.currentChat = null

    const { result } = renderHook(() => useToolPermissions())
    result.current.setPolicy(ToolCallPolicy.ASK_FOR_APPROVAL)

    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
  })
})
