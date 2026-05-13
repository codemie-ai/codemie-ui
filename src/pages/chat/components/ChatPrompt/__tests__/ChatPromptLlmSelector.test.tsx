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

import { Conversation } from '@/types/entity/conversation'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAppInfoStore, mockOverlayHide } = vi.hoisted(() => {
  return {
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
      ],
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
