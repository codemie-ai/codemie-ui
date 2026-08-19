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

import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { premiumModelTipStore, PENDING_CHAT_KEY } from '@/store/premiumModelTip'
import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import { usePremiumModelTip } from '../usePremiumModelTip'

const { mockChatsStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockChatsStore: { currentChat: null as Conversation | null },
  mockAppInfoStore: { llmModels: [] as ModelOption[] },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

const PREMIUM: ModelOption = {
  value: 'gpt-5',
  label: 'GPT-5',
  isDefault: false,
  isPremium: true,
}
const STANDARD: ModelOption = {
  value: 'gpt-4o',
  label: 'GPT-4o',
  isDefault: true,
}

const chatWith = (id: string, llmModel: string | null): Conversation =>
  ({ id, llmModel, history: [] } as unknown as Conversation)

beforeEach(() => {
  premiumModelTipStore.dismissedKeys = {}
  mockAppInfoStore.llmModels = [PREMIUM, STANDARD]
  mockChatsStore.currentChat = null
})

describe('usePremiumModelTip', () => {
  it('shows the tip for a premium model on an unsaved chat, keyed to the pending sentinel', () => {
    mockChatsStore.currentChat = chatWith('', 'gpt-5')

    const { result } = renderHook(() => usePremiumModelTip())

    expect(result.current.isPremiumActive).toBe(true)
    expect(result.current.tipKey).toBe(`${PENDING_CHAT_KEY}:gpt-5`)
    expect(result.current.tipIsVisible).toBe(true)
    expect(result.current.effectiveModel).toEqual(PREMIUM)
  })

  it('hides the tip after dismissTip', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')

    const { result, rerender } = renderHook(() => usePremiumModelTip())
    act(() => result.current.dismissTip())
    rerender()

    expect(result.current.tipIsVisible).toBe(false)
    expect(premiumModelTipStore.isDismissed('c1:gpt-5')).toBe(true)
  })

  it('reports a non-premium model as inactive with no visible tip', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-4o')

    const { result } = renderHook(() => usePremiumModelTip())

    expect(result.current.isPremiumActive).toBe(false)
    expect(result.current.tipIsVisible).toBe(false)
  })

  it('yields a null tipKey when there is no current chat', () => {
    mockChatsStore.currentChat = null

    const { result } = renderHook(() => usePremiumModelTip())

    expect(result.current.effectiveModel).toBeNull()
    expect(result.current.tipKey).toBeNull()
    expect(result.current.tipIsVisible).toBe(false)
  })

  it('yields a null tipKey when the model list has not loaded yet', () => {
    mockAppInfoStore.llmModels = []
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')

    const { result } = renderHook(() => usePremiumModelTip())

    expect(result.current.tipKey).toBeNull()
    expect(result.current.tipIsVisible).toBe(false)
  })

  it('dismissTip on a null key leaves the store untouched (CR-002)', () => {
    mockChatsStore.currentChat = null

    const { result } = renderHook(() => usePremiumModelTip())
    act(() => result.current.dismissTip())

    expect(premiumModelTipStore.dismissedKeys).toEqual({})
  })
})
