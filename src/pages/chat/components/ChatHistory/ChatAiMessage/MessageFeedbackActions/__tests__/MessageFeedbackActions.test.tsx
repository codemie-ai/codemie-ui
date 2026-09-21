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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import toaster from '@/utils/toaster'

import MessageFeedbackActions from '../MessageFeedbackActions'

const mockChatsStore = vi.hoisted(() => ({
  currentChat: { id: 'chat-1' } as { id: string } | null,
  submitFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
}))

vi.mock('valtio', () => ({ proxy: (v: unknown) => v, useSnapshot: (s: unknown) => s }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))
vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))
// The real Popup renders through a PrimeReact portal; this passthrough keeps the test focused on
// MessageFeedbackActions' own payload/error logic instead of PrimeReact's dialog plumbing.
vi.mock('@/components/Popup', () => ({
  default: ({ children, onSubmit, submitDisabled, visible }: any) =>
    visible ? (
      <div>
        {children}
        <button onClick={onSubmit} disabled={submitDisabled}>
          Send
        </button>
      </div>
    ) : null,
}))

const message = { role: 'Assistant', createdAt: '2026-09-16T00:00:00Z', assistantId: 'a1' } as any
const indexes = { historyIndex: 0, messageIndex: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  mockChatsStore.currentChat = { id: 'chat-1' }
})

describe('MessageFeedbackActions — dislike path (EPMCDME-14625)', () => {
  it('sends a string response even when message.response is undefined', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockResolvedValue(undefined)
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Dislike this response' }))
    await user.click(screen.getByRole('button', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(mockChatsStore.submitFeedback).toHaveBeenCalledWith(
        'chat-1',
        expect.objectContaining({ response: '' }),
        0,
        0
      )
    )
  })

  it('shows a friendly error and keeps the popup open when submission fails', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockRejectedValue(new Error('body.response Field required'))
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Dislike this response' }))
    await user.click(screen.getByRole('button', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        "We couldn't submit your feedback. Please try again."
      )
    )
    expect(toaster.info).not.toHaveBeenCalled()
    // Popup stays open — the catch block never hides it, only the try path does.
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })
})

describe('MessageFeedbackActions — like path (EPMCDME-14625)', () => {
  it('sends a string response even when message.response is undefined', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockResolvedValue(undefined)
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Like this response' }))

    await waitFor(() =>
      expect(mockChatsStore.submitFeedback).toHaveBeenCalledWith(
        'chat-1',
        expect.objectContaining({ response: '' }),
        0,
        0
      )
    )
  })

  it('shows a friendly error and reverts the mark when submission fails', async () => {
    const user = userEvent.setup()
    mockChatsStore.submitFeedback.mockRejectedValue(new Error('body.response Field required'))
    render(<MessageFeedbackActions message={message} indexes={indexes} />)

    await user.click(screen.getByRole('button', { name: 'Like this response' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        "We couldn't submit your feedback. Please try again."
      )
    )
    expect(toaster.info).not.toHaveBeenCalled()
    // Mark reverted to "not liked" — the label goes back to its pre-click text.
    expect(screen.getByRole('button', { name: 'Like this response' })).toBeInTheDocument()
  })
})
