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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Conversation } from '@/types/entity/conversation'

import ChatHeaderClearButton from '../ChatHeaderClearButton'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore } = vi.hoisted(() => {
  return {
    mockChatsStore: {
      currentChat: null as Conversation | null,
      clearChatHistory: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

const mockChat = {
  id: 'chat-123',
  name: 'Test Chat',
  isGroup: false,
  assistantData: [],
} as unknown as Conversation

describe('ChatHeaderClearButton', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockChatsStore.currentChat = mockChat
  })

  it('renders clear button', () => {
    render(<ChatHeaderClearButton />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-tooltip-content', 'Clear Chat')
  })

  it('opens confirmation modal when clicked', async () => {
    render(<ChatHeaderClearButton />)

    const clearButton = screen.getByRole('button')
    await user.click(clearButton)

    expect(screen.getByText('Clear conversation')).toBeInTheDocument()
  })

  it('displays correct modal message', async () => {
    render(<ChatHeaderClearButton />)

    await user.click(screen.getByRole('button'))

    expect(
      screen.getByText(
        'Are you sure you want to clear this conversation? This action cannot be undone.'
      )
    ).toBeInTheDocument()
  })

  it('displays Clear confirm button', async () => {
    render(<ChatHeaderClearButton />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button', { name: /^clear$/i })).toBeInTheDocument()
  })

  it('modal is not visible initially', () => {
    render(<ChatHeaderClearButton />)
    expect(screen.queryByText('Clear conversation')).not.toBeInTheDocument()
  })

  it('closes modal when cancel is clicked', async () => {
    render(<ChatHeaderClearButton />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Clear conversation')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText('Clear conversation')).not.toBeInTheDocument()
    })
  })

  it('calls clearChatHistory when confirm is clicked', async () => {
    render(<ChatHeaderClearButton />)

    await user.click(screen.getByRole('button'))
    const confirmButton = screen.getByRole('button', { name: /^clear$/i })
    await user.click(confirmButton)

    expect(mockChatsStore.clearChatHistory).toHaveBeenCalledWith('chat-123')
  })

  it('closes modal after confirming', async () => {
    render(<ChatHeaderClearButton />)

    await user.click(screen.getByRole('button'))
    const confirmButton = screen.getByRole('button', { name: /^clear$/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.queryByText('Clear conversation')).not.toBeInTheDocument()
    })
  })
})
