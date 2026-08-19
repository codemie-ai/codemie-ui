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

import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { premiumModelTipStore } from '@/store/premiumModelTip'
import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPremiumModelTipSlot from '../ChatPremiumModelTipSlot'
import { PREMIUM_TIP_SLOT_MAX_HEIGHT } from '../premiumTipLayout'

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

// The unit project mocks useSnapshot, so a store write does not re-render on
// its own; tests that dismiss re-render explicitly to read the new state.
const render = (ui: React.ReactElement) => {
  const result = rtlRender(<MemoryRouter>{ui}</MemoryRouter>)
  return {
    ...result,
    rerender: (next: React.ReactElement) => result.rerender(<MemoryRouter>{next}</MemoryRouter>),
  }
}

const PREMIUM: ModelOption = { value: 'gpt-5', label: 'GPT-5', isDefault: false, isPremium: true }
const OTHER_PREMIUM: ModelOption = {
  value: 'opus-5',
  label: 'Opus 5',
  isDefault: false,
  isPremium: true,
}
const STANDARD: ModelOption = { value: 'gpt-4o', label: 'GPT-4o', isDefault: true }

const chatWith = (id: string, llmModel: string | null): Conversation =>
  ({ id, llmModel, history: [] } as unknown as Conversation)

const TIP_HEADING = 'Premium model active'

beforeEach(() => {
  premiumModelTipStore.dismissedKeys = {}
  mockAppInfoStore.llmModels = [PREMIUM, OTHER_PREMIUM, STANDARD]
  mockChatsStore.currentChat = null
})

describe('ChatPremiumModelTipSlot', () => {
  // Reproduction of symptom 1: the tip stayed hidden on a brand-new chat.
  // The old key required a truthy chat id, so an unsaved chat (id '') never
  // produced a key and the tip never rendered — and the dismissal on the
  // previous chat lived in component state that the remount discarded.
  it('renders again on a new chat after being dismissed on the previous chat', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')
    const { unmount, rerender } = render(<ChatPremiumModelTipSlot />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss premium model tip' }))
    rerender(<ChatPremiumModelTipSlot />)
    expect(screen.queryByText(TIP_HEADING)).not.toBeInTheDocument()
    unmount()

    // startNewChat(): unsaved chat, empty history, same premium model.
    premiumModelTipStore.clearPendingDismissals()
    mockChatsStore.currentChat = chatWith('', 'gpt-5')
    render(<ChatPremiumModelTipSlot />)

    expect(screen.getByText(TIP_HEADING)).toBeInTheDocument()
  })

  it('renders on a premium chat with no messages', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')

    render(<ChatPremiumModelTipSlot />)

    expect(screen.getByText(TIP_HEADING)).toBeInTheDocument()
    expect(screen.getByText(/GPT-5/)).toBeInTheDocument()
  })

  it('hides the tip after the dismiss button is clicked', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')

    const { rerender } = render(<ChatPremiumModelTipSlot />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss premium model tip' }))
    rerender(<ChatPremiumModelTipSlot />)

    expect(screen.queryByText(TIP_HEADING)).not.toBeInTheDocument()
    expect(premiumModelTipStore.isDismissed('c1:gpt-5')).toBe(true)
  })

  it('stays hidden when the same chat and model are rendered again', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')
    const { unmount } = render(<ChatPremiumModelTipSlot />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss premium model tip' }))
    unmount()

    render(<ChatPremiumModelTipSlot />)

    expect(screen.queryByText(TIP_HEADING)).not.toBeInTheDocument()
  })

  it('shows the tip again after switching to a different premium model', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')
    const { unmount } = render(<ChatPremiumModelTipSlot />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss premium model tip' }))
    unmount()

    mockChatsStore.currentChat = chatWith('c1', 'opus-5')
    render(<ChatPremiumModelTipSlot />)

    expect(screen.getByText(TIP_HEADING)).toBeInTheDocument()
    expect(screen.getByText(/Opus 5/)).toBeInTheDocument()
  })

  it('renders nothing for a non-premium model', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-4o')

    const { container } = render(<ChatPremiumModelTipSlot />)

    expect(container).toBeEmptyDOMElement()
  })

  // CR-004: the history panel's floor is raised by exactly this much while the
  // tip shows, so the slot must never grow past it — otherwise dragging the
  // separator to the minimum squeezes the conversation toward zero.
  it('caps its own height at the constant the panel floor is computed from', () => {
    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')

    const { container } = render(<ChatPremiumModelTipSlot />)

    const slot = container.querySelector<HTMLElement>('[data-testid="premium-tip-slot"]')!
    expect(slot.style.maxHeight).toBe(`${PREMIUM_TIP_SLOT_MAX_HEIGHT}px`)
    expect(slot.className).toContain('overflow-y-auto')
  })

  it('a transient render with no current chat neither shows nor permanently hides the tip', () => {
    mockChatsStore.currentChat = null
    const { unmount } = render(<ChatPremiumModelTipSlot />)
    expect(screen.queryByText(TIP_HEADING)).not.toBeInTheDocument()
    expect(premiumModelTipStore.dismissedKeys).toEqual({})
    unmount()

    mockChatsStore.currentChat = chatWith('c1', 'gpt-5')
    render(<ChatPremiumModelTipSlot />)

    expect(screen.getByText(TIP_HEADING)).toBeInTheDocument()
  })
})
