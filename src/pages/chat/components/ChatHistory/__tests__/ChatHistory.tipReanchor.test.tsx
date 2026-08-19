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

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { premiumModelTipStore } from '@/store/premiumModelTip'
import type { ModelOption } from '@/types/entity/configuration'
import type { Conversation } from '@/types/entity/conversation'

import ChatHistory from '../ChatHistory'

const PREMIUM: ModelOption = { value: 'gpt-5', label: 'GPT-5', isDefault: false, isPremium: true }

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

vi.mock('../ChatHistoryGroup', () => ({
  default: () => <div data-testid="history-group" />,
}))

vi.mock('../hooks/useChatInfiniteScroll', () => ({
  useChatInfiniteScroll: () => ({
    refs: { rootRef: vi.fn(), sentryRef: { current: null } },
    visibleHistory: [],
    hasMoreMessages: false,
    lastMessageIndex: 0,
  }),
}))

const SCROLL_HEIGHT = 1000

const CHAT = { id: 'c1', llmModel: 'gpt-5', history: [] } as unknown as Conversation

const tipKey = () => premiumModelTipStore.buildKey('c1', 'gpt-5')!

// `useChatScroll` is deliberately NOT mocked here: the point of the dependency
// is what the scroll container does, not which arguments the hook receives.
const renderHistory = () => {
  const scrollTo = vi.fn()
  Element.prototype.scrollTo = scrollTo

  const result = render(<ChatHistory />)
  const scrollContainer = result.container.querySelector('.overflow-y-auto') as HTMLElement
  Object.defineProperty(scrollContainer, 'scrollHeight', { value: SCROLL_HEIGHT, writable: true })
  scrollTo.mockClear()

  return { ...result, scrollTo }
}

// The tip renders one level up, in ChatPage, but it still takes height out of
// this scroll container: when it appears or is dismissed the last message would
// otherwise sit behind it or leave a gap. ChatHistory feeds `tipIsVisible` into
// useChatScroll's layoutDeps for exactly that reason, and nothing in the diff
// noticed if that argument disappeared.
describe('ChatHistory — re-anchors at the bottom when the premium tip toggles', () => {
  beforeEach(() => {
    premiumModelTipStore.dismissedKeys = {}
    mockAppInfoStore.llmModels = [PREMIUM]
    mockChatsStore.currentChat = CHAT
  })

  it('scrolls back to the bottom when the tip is dismissed', () => {
    const { rerender, scrollTo } = renderHistory()

    premiumModelTipStore.dismiss(tipKey())
    rerender(<ChatHistory />)

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT, behavior: 'instant' })
  })

  it('scrolls back to the bottom when the tip appears again', () => {
    premiumModelTipStore.dismiss(tipKey())
    const { rerender, scrollTo } = renderHistory()

    premiumModelTipStore.dismissedKeys = {}
    rerender(<ChatHistory />)

    expect(scrollTo).toHaveBeenCalledWith({ top: SCROLL_HEIGHT, behavior: 'instant' })
  })

  it('does not re-scroll on a re-render that changes nothing', () => {
    const { rerender, scrollTo } = renderHistory()

    rerender(<ChatHistory />)

    expect(scrollTo).not.toHaveBeenCalled()
  })
})
