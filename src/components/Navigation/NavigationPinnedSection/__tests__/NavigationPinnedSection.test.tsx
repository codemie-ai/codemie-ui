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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NavigationPinnedSection from '../NavigationPinnedSection'

// Unmock the component — it is globally stubbed in setupTests.tsx
vi.unmock('@/components/Navigation/NavigationPinnedSection/NavigationPinnedSection')

// Mock PinnedRow to avoid deep dependency chain
vi.mock('@/components/Navigation/NavigationPinnedSection/PinnedRow', () => ({
  default: ({ item }: { item: { name: string } }) => (
    <div data-testid="pinned-row">{item.name}</div>
  ),
}))

vi.mock('@/components/Navigation/NavigationPinnedSection/OverflowButton', () => ({
  default: () => <button type="button">overflow</button>,
}))

vi.mock('@/components/Navigation/NavigationPinnedSection/PinnedAssistantsOverflowDropdown', () => ({
  default: () => null,
}))

vi.mock('@/components/Navigation/NavigationPinnedSection/UnpinFromSidebarPopup', () => ({
  default: () => null,
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: ({ name }: { name: string }) => <img alt={name} />,
}))

vi.mock('@/assets/images/ai-avatar.png', () => ({ default: 'avatar.png' }))

vi.mock('@/utils/assistantAvatar', () => ({
  generateAssistantAvatarDataUrl: vi.fn(() => 'data:image/svg+xml;test'),
}))

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore, mockAssistantsStore, mockChatsStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: { navigationExpanded: true },
    mockAssistantsStore: {
      helpAssistants: [] as any[],
      pinnedAssistants: [] as any[],
      helpAssistantsFetched: false,
      fetchPinnedAssistants: vi.fn(),
      updateRecentAssistants: vi.fn(),
      unpinAssistant: vi.fn(),
    },
    mockChatsStore: {
      startNewChat: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    if (store === mockAssistantsStore) return mockAssistantsStore
    if (store === mockChatsStore) return mockChatsStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/assistants', () => ({ assistantsStore: mockAssistantsStore }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [true, true]),
  usePinnedAssistantsEnabled: vi.fn(() => [false]),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn(), resolve: vi.fn() })),
}))

vi.mock('@/constants/assistants', () => ({
  ONBOARDING_ASSISTANT_SLUG: 'onboarding',
  CHATBOT_ASSISTANT_SLUG: 'ai-run-chatbot',
}))

// Provide a ResizeObserver that fires synchronously with enough height for allFit
class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(_el: Element) {
    this.callback([{ contentRect: { height: 300 } }] as ResizeObserverEntry[], this)
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    // no-op
  }
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

const faqAssistant = {
  id: 'faq-id',
  slug: 'onboarding',
  name: 'FAQ',
  description: 'FAQ help',
  icon_url: 'faq.png',
}

const chatbotAssistant = {
  id: 'chatbot-id',
  slug: 'ai-run-chatbot',
  name: 'Chatbot',
  description: 'Chat help',
  icon_url: 'chatbot.png',
}

describe('NavigationPinnedSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssistantsStore.helpAssistants = []
    mockAssistantsStore.pinnedAssistants = []
    mockAssistantsStore.helpAssistantsFetched = false
    mockAppInfoStore.navigationExpanded = true
  })

  describe('semantic list structure (expanded)', () => {
    it('renders a ul element when items are present and navigation is expanded', async () => {
      mockAssistantsStore.helpAssistants = [faqAssistant, chatbotAssistant] as any
      mockAssistantsStore.helpAssistantsFetched = true
      const { container, findAllByTestId } = render(<NavigationPinnedSection />)
      await findAllByTestId('pinned-row')
      expect(container.querySelector('ul')).toBeInTheDocument()
    })

    it('wraps each assistant row in a li element', async () => {
      mockAssistantsStore.helpAssistants = [faqAssistant, chatbotAssistant] as any
      mockAssistantsStore.helpAssistantsFetched = true
      const { container, findAllByTestId } = render(<NavigationPinnedSection />)
      await findAllByTestId('pinned-row')
      expect(container.querySelectorAll('li')).toHaveLength(2)
    })

    it('each li contains exactly one pinned row', async () => {
      mockAssistantsStore.helpAssistants = [faqAssistant, chatbotAssistant] as any
      mockAssistantsStore.helpAssistantsFetched = true
      const { container, findAllByTestId } = render(<NavigationPinnedSection />)
      await findAllByTestId('pinned-row')
      const listItems = container.querySelectorAll('li')
      listItems.forEach((li) => {
        expect(li.querySelectorAll('[data-testid="pinned-row"]')).toHaveLength(1)
      })
    })

    it('renders no ul when assistants have not been fetched', () => {
      mockAssistantsStore.helpAssistants = [faqAssistant] as any
      mockAssistantsStore.helpAssistantsFetched = false
      const { container } = render(<NavigationPinnedSection />)
      expect(container.querySelector('ul')).not.toBeInTheDocument()
    })
  })
})
