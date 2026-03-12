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

import ChatHeaderShareButton from '../ChatHeaderShareButton/ChatHeaderShareButton'

vi.hoisted(() => vi.resetModules())

const { mockChatsStore } = vi.hoisted(() => {
  return {
    mockChatsStore: {
      currentChat: null as Conversation | null,
      shareChat: vi.fn(),
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

describe('ChatHeaderShareButton', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockChatsStore.currentChat = mockChat
    mockChatsStore.shareChat = vi.fn()
  })

  it('renders share button', () => {
    render(<ChatHeaderShareButton />)

    const button = screen.getByRole('button')

    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-tooltip-content', 'Share Chat')
    expect(button).not.toBeDisabled()

    expect(screen.queryByText('Share chat')).not.toBeInTheDocument()
  })

  it('calls shareChat when button is clicked', async () => {
    mockChatsStore.shareChat = vi.fn().mockResolvedValue('https://example.com/shared-chat')
    render(<ChatHeaderShareButton />)

    await user.click(screen.getByRole('button'))

    expect(mockChatsStore.shareChat).toHaveBeenCalledWith('chat-123')
  })

  it('shows popup with share link after successful share', async () => {
    const shareLink = 'https://example.com/shared-chat'
    mockChatsStore.shareChat = vi.fn().mockResolvedValue(shareLink)
    render(<ChatHeaderShareButton />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Share chat')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue(shareLink)).toBeInTheDocument()
  })

  it('disables button while loading', async () => {
    let resolveShare: (value: string) => void
    const sharePromise = new Promise<string>((resolve) => {
      resolveShare = resolve
    })
    mockChatsStore.shareChat = vi.fn().mockReturnValue(sharePromise)

    render(<ChatHeaderShareButton />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(button).toBeDisabled()

    resolveShare!('https://example.com/shared-chat')
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })

  it('does not show popup if shareChat returns null', async () => {
    mockChatsStore.shareChat = vi.fn().mockResolvedValue(null)
    render(<ChatHeaderShareButton />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockChatsStore.shareChat).toHaveBeenCalled()
    })

    expect(screen.queryByText('Share chat')).not.toBeInTheDocument()
  })

  it('handles shareChat error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockChatsStore.shareChat = vi.fn().mockRejectedValue(new Error('Failed to share'))
    render(<ChatHeaderShareButton />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(mockChatsStore.shareChat).toHaveBeenCalled()
    })

    expect(screen.queryByText('Share chat')).not.toBeInTheDocument()
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to share chat:', expect.any(Error))

    consoleErrorSpy.mockRestore()
  })

  it('re-enables button after error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockChatsStore.shareChat = vi.fn().mockRejectedValue(new Error('Failed'))
    render(<ChatHeaderShareButton />)

    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })

    consoleErrorSpy.mockRestore()
  })
})
