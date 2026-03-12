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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ShareChatPopup from '../ChatHeaderShareButton/ShareChatPopup'

vi.hoisted(() => vi.resetModules())

const mockCopyToClipboard = vi.hoisted(() => vi.fn())

vi.mock('@/utils/helpers', () => ({
  copyToClipboard: mockCopyToClipboard,
}))

describe('ShareChatPopup', () => {
  let user: UserEvent
  const mockOnHide = vi.fn()
  const shareLink = 'https://example.com/shared-chat/abc123'

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('does not render when isVisible is false', () => {
    render(<ShareChatPopup isVisible={false} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.queryByText('Share chat')).not.toBeInTheDocument()
  })

  it('renders when isVisible is true', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.getByText('Share chat')).toBeInTheDocument()
  })

  it('displays description text', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.getByText(/Share your conversation with others/i)).toBeInTheDocument()
  })

  it('displays read-only information', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.getByText(/The shared chat is read-only/i)).toBeInTheDocument()
  })

  it('renders share link input with correct value', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    const input = screen.getByDisplayValue(shareLink) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe(shareLink)
  })

  it('input is read-only', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    const input = screen.getByDisplayValue(shareLink) as HTMLInputElement
    expect(input).toHaveAttribute('readonly')
  })

  it('renders copy button', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('calls copyToClipboard when copy button is clicked', async () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(mockCopyToClipboard).toHaveBeenCalledWith(shareLink)
  })

  it('shows "Copied!" text after copying', async () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(screen.getByText('Copied!')).toBeInTheDocument()
  })

  it('reverts to "Copy" text after 2 seconds', async () => {
    vi.useFakeTimers()
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    copyButton.click()

    await vi.waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })

    vi.advanceTimersByTime(2000)

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    vi.useRealTimers()
  })

  it('displays warning message about not being able to revoke access', () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)
    expect(screen.getByText(/You cannot revoke access once shared/i)).toBeInTheDocument()
  })

  it('selects input text when clicked', async () => {
    render(<ShareChatPopup isVisible={true} shareLink={shareLink} onHide={mockOnHide} />)

    const input = screen.getByDisplayValue(shareLink) as HTMLInputElement
    const selectSpy = vi.spyOn(input, 'select')

    await user.click(input)

    expect(selectSpy).toHaveBeenCalled()
  })

  it('does not call copyToClipboard if shareLink is undefined', async () => {
    render(<ShareChatPopup isVisible={true} shareLink={undefined} onHide={mockOnHide} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(mockCopyToClipboard).not.toHaveBeenCalled()
  })

  it('does not show "Copied!" if shareLink is undefined', async () => {
    render(<ShareChatPopup isVisible={true} shareLink={undefined} onHide={mockOnHide} />)

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
  })
})
