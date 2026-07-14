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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProfileCard from '../ProfileCard'

vi.hoisted(() => vi.resetModules())

const { mockCopyToClipboard } = vi.hoisted(() => ({
  mockCopyToClipboard: vi.fn(),
}))

vi.mock('@/assets/icons/copy.svg?react', () => ({
  default: () => <svg data-testid="copy-icon" />,
}))

vi.mock('@/assets/images/avatar.jpg', () => ({
  default: 'avatar.jpg',
}))

vi.mock('@/utils/helpers', () => ({
  copyToClipboard: mockCopyToClipboard,
}))

const mockUser = {
  userId: 'user-abc-123',
  name: 'Jane Smith',
  picture: null,
} as any

describe('ProfileCard — copy button accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has aria-label "Copy user ID" on the copy button', () => {
    render(<ProfileCard user={mockUser} />)
    expect(screen.getByLabelText('Copy user ID')).toBeInTheDocument()
  })

  it('copy button has min-w-[24px] and min-h-[24px] classes', () => {
    render(<ProfileCard user={mockUser} />)
    const btn = screen.getByLabelText('Copy user ID')
    expect(btn.className).toContain('min-w-[24px]')
    expect(btn.className).toContain('min-h-[24px]')
  })

  it('copy button has a focus-visible ring class', () => {
    render(<ProfileCard user={mockUser} />)
    const btn = screen.getByLabelText('Copy user ID')
    expect(btn.className).toContain('focus-visible:ring-1')
  })

  it('calls copyToClipboard with userId when clicked', () => {
    render(<ProfileCard user={mockUser} />)
    fireEvent.click(screen.getByLabelText('Copy user ID'))
    expect(mockCopyToClipboard).toHaveBeenCalledWith('user-abc-123', 'User ID copied to clipboard')
  })
})
