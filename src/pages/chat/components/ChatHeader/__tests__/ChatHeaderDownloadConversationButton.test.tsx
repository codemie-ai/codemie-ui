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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChatHeaderDownloadConversationButton from '../ChatHeaderDownloadConversationButton'

const { mockToaster, mockChatsStore } = vi.hoisted(() => {
  return {
    mockToaster: {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    },
    mockChatsStore: {
      currentChat: {
        id: 'chat-123',
        name: 'Test Chat',
      },
      exportChat: vi.fn(),
    },
  }
})

vi.mock('@/utils/toaster', () => ({
  default: mockToaster,
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

describe('ChatHeaderDownloadConversationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChatsStore.exportChat.mockResolvedValue(true)
  })

  it('renders the export button', () => {
    render(<ChatHeaderDownloadConversationButton />)

    const button = screen.getByLabelText('Export Conversation')
    expect(button).toBeInTheDocument()
  })

  it('has correct tooltip on main button', () => {
    const { container } = render(<ChatHeaderDownloadConversationButton />)

    const button = container.querySelector('[data-tooltip-content="Export Conversation"]')
    expect(button).toBeInTheDocument()
  })

  it('component renders without errors', () => {
    const { container } = render(<ChatHeaderDownloadConversationButton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('export button has correct accessibility attributes', () => {
    render(<ChatHeaderDownloadConversationButton />)

    const button = screen.getByLabelText('Export Conversation')

    expect(button).toHaveAttribute('aria-label', 'Export Conversation')
    expect(button).toHaveAttribute('data-tooltip-content', 'Export Conversation')
    expect(button).toHaveAttribute('type', 'button')
  })
})
