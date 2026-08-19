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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import { Conversation } from '@/types/entity/conversation'
import { setupTooltipCloseBehavior, type GlobalTooltipHandle } from '@/utils/tooltipCloseBehavior'

import ChatPromptLlmSelector from '../ChatPromptLlmSelector'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore, mockAppInfoStore } = vi.hoisted(() => ({
  mockChatsStore: {
    currentChat: null as Conversation | null,
    updateChat: vi.fn(),
  },
  mockAppInfoStore: {
    llmModels: [
      { label: 'GPT-4', value: 'gpt-4', isDefault: true },
      { label: 'Claude-2', value: 'claude-2', isPremium: true },
    ] as ModelOption[],
    getLLMModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => store),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>(({ children, onShow }, ref) => {
    React.useImperativeHandle(ref, () => ({
      toggle: () => onShow?.(),
      show: () => onShow?.(),
      hide: vi.fn(),
    }))
    return <div data-testid="overlay-panel">{children}</div>
  }),
}))

// Filtering the list is the most common way a hovered row disappears, and it
// emits no scroll and no resize — the two events the global tooltip closes on.
// react-tooltip keeps its `activeAnchor` and strands the overlay at the
// viewport corner, which is the symptom Follow-up 2 asked to remove.
describe('ChatPromptLlmSelector — tooltip stranding on the filter path', () => {
  let teardown: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.currentChat = { id: 'chat-1', llmModel: null } as unknown as Conversation
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    teardown?.()
  })

  const hoverRow = (name: RegExp) => {
    const row = screen.getByRole('option', { name })
    const anchor = row.querySelector<HTMLElement>('[data-testid="llm-option-row"]')!
    fireEvent.mouseOver(anchor)
    return anchor
  }

  it('closes the tooltip when the hovered row is filtered out of the list', async () => {
    render(<ChatPromptLlmSelector />)

    const anchor = hoverRow(/Claude-2/)
    const handle: GlobalTooltipHandle = { isOpen: true, activeAnchor: anchor, close: vi.fn() }
    teardown = setupTooltipCloseBehavior(() => handle)

    fireEvent.change(screen.getByPlaceholderText('Search models…'), { target: { value: 'gpt' } })

    expect(screen.queryByRole('option', { name: /Claude-2/ })).toBeNull()
    await waitFor(() => expect(handle.close).toHaveBeenCalledTimes(1))
  })

  it('leaves the tooltip open while the hovered row survives the filter', async () => {
    render(<ChatPromptLlmSelector />)

    const anchor = hoverRow(/Claude-2/)
    const handle: GlobalTooltipHandle = { isOpen: true, activeAnchor: anchor, close: vi.fn() }
    teardown = setupTooltipCloseBehavior(() => handle)

    fireEvent.change(screen.getByPlaceholderText('Search models…'), { target: { value: 'claude' } })

    expect(screen.getByRole('option', { name: /Claude-2/ })).toBeInTheDocument()
    await waitFor(() => expect(handle.close).not.toHaveBeenCalled())
  })
})
