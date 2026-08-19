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

import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAppInfoStore, mockOverlayHide, mockTruncation } = vi.hoisted(() => {
  return {
    // jsdom has no layout, so the real hook can never report truncation. The row
    // composes its hover text from this flag, so the tests drive it directly.
    mockTruncation: { isTruncated: false },
    mockChatsStore: {
      currentChat: null as Conversation | null,
      updateChat: vi.fn(),
    },
    mockAppInfoStore: {
      llmModels: [
        { label: 'GPT-4', value: 'gpt-4', isDefault: true },
        { label: 'GPT-3.5', value: 'gpt-3.5-turbo', isDefault: false },
        { label: 'Claude-2', value: 'claude-2', isDefault: false },
        { label: 'Llama-3', value: 'llama-3', isDefault: false },
      ] as ModelOption[],
      getLLMModels: vi.fn(),
    },
    mockOverlayHide: vi.fn(),
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockChatsStore) return mockChatsStore
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: () => mockTruncation.isTruncated,
}))

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>(({ children, onShow }, ref) => {
    React.useImperativeHandle(ref, () => ({
      toggle: () => onShow?.(),
      show: () => onShow?.(),
      hide: mockOverlayHide,
    }))
    return <div data-testid="overlay-panel">{children}</div>
  }),
}))

const mockChat: Conversation = {
  id: 'chat-123',
  name: 'Test Chat',
  llmModel: null,
  isGroup: false,
  assistantData: [],
} as unknown as Conversation

describe('ChatPromptLlmSelector — keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = mockChat
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.getLLMModels = vi.fn()
    // jsdom does not implement scrollIntoView; stub it so the
    // scroll-into-view effect (added in Task 6) does not throw.
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('highlights the first navigable item by default via aria-activedescendant', () => {
    render(<ChatPromptLlmSelector />)

    const input = screen.getByPlaceholderText('Search models…')
    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-default')
  })

  it('ArrowDown moves the highlight to the next item', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-recommended')
  })

  it('ArrowUp from the first item wraps to the last', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'ArrowUp' })

    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-llama-3')
  })

  it('ArrowDown from the last item wraps to the first', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    for (let i = 0; i < 5; i += 1) {
      fireEvent.keyDown(input, { key: 'ArrowDown' })
    }
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-default')
  })

  it('Enter on a highlighted model calls updateChat with that model value and hides the panel', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-123', {
      llmModel: 'gpt-4',
    })
    expect(mockOverlayHide).toHaveBeenCalled()
  })

  it('Enter on the Assistant Default row calls updateChat with llmModel: null', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-123', {
      llmModel: null,
    })
  })

  it('Escape hides the overlay panel', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'Escape' })

    expect(mockOverlayHide).toHaveBeenCalled()
  })

  it('Typing into search resets the highlighted index to 0', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-recommended')

    fireEvent.change(input, { target: { value: 'gpt' } })

    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-gpt-4')
  })

  it('Hovering an item updates the highlighted index so Enter selects the hovered model', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    const claudeButton = screen.getByRole('option', { name: /Claude-2/ })
    fireEvent.mouseEnter(claudeButton)

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockChatsStore.updateChat).toHaveBeenCalledWith('chat-123', {
      llmModel: 'claude-2',
    })
  })

  it('Empty filtered list — keys no-op and aria-activedescendant is absent', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.change(input, { target: { value: 'no-such-model' } })

    expect(input.getAttribute('aria-activedescendant')).toBeNull()

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockChatsStore.updateChat).not.toHaveBeenCalled()
    expect(screen.getByText('No models found')).toBeInTheDocument()
  })

  it('Reopening the panel resets the highlight to the first item', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    // Move highlight away from the default
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-gpt-4')

    // Simulate closing + reopening the panel via the trigger button.
    // The mocked OverlayPanel's toggle() invokes the component's onShow,
    // which is the production reopen path. Note that 'search' is still '',
    // so the search-change effect would NOT fire on its own — this asserts
    // the dedicated reset inside handleOverlayShow.
    const trigger = screen.getByRole('button', { name: 'Default' })
    fireEvent.click(trigger)

    expect(input.getAttribute('aria-activedescendant')).toBe('chat-llm-selector-option-default')
  })

  it('aria-activedescendant references the id of the currently highlighted button', () => {
    render(<ChatPromptLlmSelector />)
    const input = screen.getByPlaceholderText('Search models…')

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    const expectedId = input.getAttribute('aria-activedescendant')
    expect(expectedId).toBe('chat-llm-selector-option-gpt-4')

    const highlightedButton = document.getElementById(expectedId!)
    expect(highlightedButton).not.toBeNull()
    expect(highlightedButton?.getAttribute('role')).toBe('option')
  })
})

describe('ChatPromptLlmSelector — premium badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = mockChat
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.getLLMModels = vi.fn()
    mockAppInfoStore.llmModels = [
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ]
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('marks premium model options with a meta line under the name', () => {
    render(<ChatPromptLlmSelector />)

    const premiumRow = screen.getByRole('option', { name: /Claude Opus 4.1/ })
    const meta = premiumRow.querySelector<HTMLElement>('[data-testid="llm-option-meta"]')!
    expect(meta).not.toBeNull()
    expect(meta.textContent).toBe('Premium')

    const standardRow = screen.getByRole('option', { name: /^GPT-4o$/ })
    expect(standardRow.querySelector('[data-testid="llm-option-meta"]')).toBeNull()
  })

  // The badge competed with the model name for the row's width and lost in one
  // panel while winning in the other. Rows carry no badge at all now; the meta
  // line names the state and the trigger keeps the pill.
  it('renders no premium badge inside any dropdown row', () => {
    render(<ChatPromptLlmSelector />)

    screen.getAllByRole('option').forEach((row) => {
      expect(row.querySelector('[role="status"]')).toBeNull()
      expect(row.querySelector('[data-testid="premium-model-dot"]')).toBeNull()
      expect(row.querySelector('[data-testid="premium-model-text"]')).toBeNull()
    })
  })

  // A model that is both the recommended default and premium gets one meta line,
  // not a subtitle plus a badge and not two stacked subtitles.
  it('joins Recommended and Premium into a single meta line', () => {
    mockAppInfoStore.llmModels = [
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true, isPremium: true },
      { label: 'Llama-3', value: 'llama-3', isDefault: false },
    ] as ModelOption[]

    render(<ChatPromptLlmSelector />)

    const recommendedRow = document.getElementById(
      'chat-llm-selector-option-recommended'
    ) as HTMLElement
    const metas = recommendedRow.querySelectorAll<HTMLElement>('[data-testid="llm-option-meta"]')

    expect(metas).toHaveLength(1)
    expect(metas[0].textContent).toBe('Recommended · Premium')
  })

  it('keeps the plain Recommended meta line for a non-premium default model', () => {
    render(<ChatPromptLlmSelector />)

    const recommendedRow = document.getElementById(
      'chat-llm-selector-option-recommended'
    ) as HTMLElement
    const meta = recommendedRow.querySelector<HTMLElement>('[data-testid="llm-option-meta"]')!

    expect(meta.textContent).toBe('Recommended')
  })

  it('shows Premium badge in the trigger when a premium model is selected', () => {
    mockChatsStore.currentChat = {
      ...mockChat,
      llmModel: 'claude-opus-4-1',
    } as unknown as Conversation

    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /Claude Opus 4.1/ })
    expect(trigger).toHaveTextContent('Premium')
  })

  it('does not show Premium badge in the trigger for a standard model', () => {
    mockChatsStore.currentChat = { ...mockChat, llmModel: 'gpt-4o' } as unknown as Conversation

    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /GPT-4o/ })
    expect(trigger).not.toHaveTextContent('Premium')
  })

  // The badge the trigger renders already owns the premium tooltip text, so the
  // trigger must not duplicate it — two nested anchors made the tooltip flicker
  // as the pointer crossed between them.
  it('emits no tooltip attributes on the trigger while the premium badge is shown', () => {
    mockChatsStore.currentChat = {
      ...mockChat,
      llmModel: 'claude-opus-4-1',
    } as unknown as Conversation

    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /Claude Opus 4.1/ })
    expect(trigger.hasAttribute('data-tooltip-content')).toBe(false)
    expect(trigger.hasAttribute('data-tooltip-id')).toBe(false)
  })

  it('keeps the select-model tooltip on the trigger for a standard model', () => {
    mockChatsStore.currentChat = { ...mockChat, llmModel: 'gpt-4o' } as unknown as Conversation

    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /GPT-4o/ })
    expect(trigger.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(trigger.getAttribute('data-tooltip-content')).toBe(
      'Select LLM model for this conversation'
    )
  })
})

// The option row is a `justify-between` flex container. When the check mark is
// mounted only on the selected row, the badge of a selected premium model sits
// one check-width further left than the badge of an unselected premium model —
// the badges visibly jump as the selection moves. The fix is a left group that
// owns name + badge and a check slot that is always rendered and merely hidden.
describe('ChatPromptLlmSelector — option row slot layout', () => {
  const optionMain = (row: HTMLElement) =>
    row.querySelector<HTMLElement>('[data-testid="llm-option-main"]')
  const optionCheck = (row: HTMLElement) =>
    row.querySelector<HTMLElement>('[data-testid="llm-option-check"]')
  const optionRow = (row: HTMLElement) =>
    row.querySelector<HTMLElement>('[data-testid="llm-option-row"]')

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.getLLMModels = vi.fn()
    mockAppInfoStore.llmModels = [
      { label: 'Claude Opus 4.1', value: 'claude-opus-4-1', isDefault: false, isPremium: true },
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: false,
        isPremium: true,
      },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ] as ModelOption[]
    mockChatsStore.currentChat = {
      ...mockChat,
      llmModel: 'claude-opus-4-1',
    } as unknown as Conversation
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders a check slot on every option row, including unselected ones', () => {
    render(<ChatPromptLlmSelector />)

    const rows = screen.getAllByRole('option')
    expect(rows.length).toBeGreaterThan(1)
    rows.forEach((row) => {
      expect(optionCheck(row)).not.toBeNull()
    })
  })

  it('hides the check slot with `invisible` on unselected rows and shows it on the selected row', () => {
    render(<ChatPromptLlmSelector />)

    const selectedRow = screen.getByRole('option', { name: /Claude Opus 4\.1/ })
    const unselectedRow = screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ })

    expect(optionCheck(selectedRow)!.className).not.toContain('invisible')
    expect(optionCheck(unselectedRow)!.className).toContain('invisible')
  })

  it('stacks the meta line under the name inside the left group', () => {
    render(<ChatPromptLlmSelector />)

    const rows = [
      screen.getByRole('option', { name: /Claude Opus 4\.1/ }),
      screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }),
    ]

    rows.forEach((row) => {
      const main = optionMain(row)
      expect(main).not.toBeNull()
      expect(main!.className).toContain('min-w-0')
      expect(main!.className).toContain('flex-col')
      const children = Array.from(main!.children)
      expect(children).toHaveLength(2)
      expect(children[1].getAttribute('data-testid')).toBe('llm-option-meta')
    })
  })

  it('keeps the check slot as the last child of the row, after the left group', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))!
    const children = Array.from(row.children)

    expect(children[0]).toBe(optionMain(row))
    expect(children[children.length - 1]).toBe(optionCheck(row))
  })

  it('exposes the same reserved check slot on the default and recommended rows', () => {
    render(<ChatPromptLlmSelector />)

    const defaultRow = document.getElementById('chat-llm-selector-option-default') as HTMLElement
    const recommendedRow = document.getElementById(
      'chat-llm-selector-option-recommended'
    ) as HTMLElement

    expect(optionMain(defaultRow)).not.toBeNull()
    expect(optionMain(recommendedRow)).not.toBeNull()
    expect(optionCheck(defaultRow)!.className).toContain('invisible')
    expect(optionCheck(recommendedRow)!.className).toContain('invisible')
  })

  it('still exposes exactly one premium tooltip anchor per premium row', () => {
    render(<ChatPromptLlmSelector />)

    const row = screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ })
    expect(row.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`)).toHaveLength(
      1
    )
  })
})

// The meta line names the state; the row still owns the hover that explains the
// rate consequence — one content string per row, nothing nested inside it
// anchoring a second same-id tooltip.
describe('ChatPromptLlmSelector — row-level hover', () => {
  const optionRow = (row: HTMLElement) =>
    row.querySelector<HTMLElement>('[data-testid="llm-option-row"]')!

  beforeEach(() => {
    vi.clearAllMocks()
    mockTruncation.isTruncated = false
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.getLLMModels = vi.fn()
    mockAppInfoStore.llmModels = [
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: false,
        isPremium: true,
      },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ] as ModelOption[]
    mockChatsStore.currentChat = {
      ...mockChat,
      llmModel: 'bedrock-claude-opus-4-5',
    } as unknown as Conversation
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('keeps the full anchoring badge in the trigger', () => {
    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /Bedrock Claude Opu/ })
    expect(trigger).toHaveTextContent('Premium')
    expect(
      trigger.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`)
    ).toHaveLength(1)
  })

  it('carries the premium hover even though the row shows the meta line', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))

    expect(row.querySelector('[data-testid="llm-option-meta"]')!.textContent).toBe('Premium')
    expect(row.getAttribute('data-tooltip-content')).toBe(PREMIUM_MODEL_TOOLTIP)
  })

  it('anchors the premium hover on the row element itself', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))

    expect(row.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(row.getAttribute('data-tooltip-content')).toBe(PREMIUM_MODEL_TOOLTIP)
  })

  it('leaves no nested tooltip anchor inside an anchoring row', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))

    expect(row.querySelectorAll('[data-tooltip-id]')).toHaveLength(0)
    expect(row.querySelectorAll('[data-tooltip-content]')).toHaveLength(0)
  })

  it('composes the full label and the premium sentence when the name truncates', () => {
    mockTruncation.isTruncated = true

    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))
    const content = row.getAttribute('data-tooltip-content')!

    expect(content).toContain('Bedrock Claude Opus 4.5')
    expect(content).toContain(PREMIUM_MODEL_TOOLTIP)
    expect(row.querySelectorAll('[data-tooltip-id]')).toHaveLength(0)
  })

  it('carries no premium content on a non-premium row', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /^GPT-4o$/ }))

    expect(row.hasAttribute('data-tooltip-content')).toBe(false)
    expect(row.hasAttribute('data-tooltip-id')).toBe(false)
  })
})

// The container query fired in one panel and not the other, so the same premium
// row rendered `● PREMIUM` in the chat panel and a lone dot in the assistant
// form. Rows no longer race horizontally at all: no query container, no badge,
// and the panel goes back to the width it had before Task 11 widened it to feed
// the query.
describe('ChatPromptLlmSelector — dropdown panel width', () => {
  const optionRow = (row: HTMLElement) =>
    row.querySelector<HTMLElement>('[data-testid="llm-option-row"]')!

  const panelClassName = () =>
    document.getElementById('chat-llm-selector-listbox')!.parentElement!.className

  beforeEach(() => {
    vi.clearAllMocks()
    mockTruncation.isTruncated = false
    mockChatsStore.updateChat = vi.fn()
    mockAppInfoStore.getLLMModels = vi.fn()
    mockAppInfoStore.llmModels = [
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: false,
        isPremium: true,
      },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ] as ModelOption[]
    mockChatsStore.currentChat = {
      ...mockChat,
      llmModel: 'bedrock-claude-opus-4-5',
    } as unknown as Conversation
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('establishes no query container on the option row', () => {
    render(<ChatPromptLlmSelector />)

    const row = optionRow(screen.getByRole('option', { name: /Bedrock Claude Opus 4\.5/ }))
    expect(row.className).not.toContain('premium-badge-container')
  })

  it('restores the pre-Task-11 panel width', () => {
    render(<ChatPromptLlmSelector />)

    const className = panelClassName()
    expect(className).toContain('min-w-64')
    expect(className).toContain('max-w-96')
    expect(className).not.toMatch(/min-w-\[/)
    expect(className).not.toMatch(/max-w-\[/)
  })

  it('keeps the trigger badge full and unchanged', () => {
    render(<ChatPromptLlmSelector />)

    const trigger = screen.getByRole('button', { name: /Bedrock Claude Opu/ })
    expect(trigger).toHaveTextContent('Premium')
    expect(trigger.querySelector('[data-testid="premium-model-dot"]')).toBeNull()
  })
})
