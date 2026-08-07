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

import { AvatarType } from '@/constants/avatar'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { generateAssistantAvatarDataUrl } from '@/utils/assistantAvatar'

import Avatar from '../Avatar'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn(() => [false]),
}))

vi.mock('@/utils/assistantAvatar', () => ({
  generateAssistantAvatarDataUrl: vi.fn(() => 'generated-url'),
}))

vi.mock('@/assets/images/ai-avatar.png', () => ({
  default: 'ai-avatar.png',
}))

vi.mock('@/components/Tooltip', () => ({
  default: () => null,
}))

// Helper to get the img element regardless of its accessible role
const getImg = (container: HTMLElement) => container.querySelector('img') as HTMLImageElement

describe('Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useFeatureFlag).mockReturnValue([false] as any)
  })

  it('renders an img element when no onClick is provided', () => {
    const { container } = render(<Avatar name="Test Assistant" />)

    const img = getImg(container)
    expect(img).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a button element when onClick is provided', () => {
    const handleClick = vi.fn()
    const { container } = render(<Avatar name="Test Assistant" onClick={handleClick} />)

    expect(screen.getByRole('button')).toBeInTheDocument()
    // img is rendered inside the button
    expect(getImg(container)).toBeInTheDocument()
  })

  it('calls onClick handler when button is clicked', () => {
    const handleClick = vi.fn()
    render(<Avatar name="Test Assistant" onClick={handleClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('uses iconUrl as image src when provided', () => {
    const { container } = render(<Avatar iconUrl="https://example.com/icon.png" name="Test" />)

    const img = getImg(container)
    expect(img).toHaveAttribute('src', 'https://example.com/icon.png')
  })

  it('falls back to ai-avatar image when no iconUrl and generatedAvatars is disabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([false] as any)

    const { container } = render(<Avatar name="Test Assistant" />)

    const img = getImg(container)
    expect(img).toHaveAttribute('src', 'ai-avatar.png')
  })

  it('falls back to generated avatar when generatedAvatars feature flag is enabled', () => {
    vi.mocked(useFeatureFlag).mockReturnValue([true] as any)

    const { container } = render(<Avatar name="Test Assistant" />)

    expect(generateAssistantAvatarDataUrl).toHaveBeenCalledWith('Test Assistant')
    const img = getImg(container)
    expect(img).toHaveAttribute('src', 'generated-url')
  })

  it('applies correct size class for AvatarType.SMALL', () => {
    const { container } = render(<Avatar name="Test" type={AvatarType.SMALL} />)

    const img = getImg(container)
    expect(img).toHaveClass('size-8')
  })

  it('applies correct size class for AvatarType.CHAT', () => {
    const { container } = render(<Avatar name="Test" type={AvatarType.CHAT} />)

    const img = getImg(container)
    expect(img).toHaveClass('size-10')
  })

  it('applies correct size class for AvatarType.MODAL', () => {
    const { container } = render(<Avatar name="Test" type={AvatarType.MODAL} />)

    const img = getImg(container)
    expect(img).toHaveClass('w-44')
    expect(img).toHaveClass('h-44')
  })

  it('sets alt attribute to name when withTooltip is true (img variant)', () => {
    render(<Avatar name="My Assistant" withTooltip={true} />)

    // When withTooltip=true, alt is non-empty so it has role "img"
    const img = screen.getByRole('img', { name: 'My Assistant' })
    expect(img).toHaveAttribute('alt', 'My Assistant')
  })

  it('sets aria-label to name when withTooltip is true (button variant)', () => {
    const handleClick = vi.fn()
    render(<Avatar name="My Assistant" withTooltip={true} onClick={handleClick} />)

    const button = screen.getByRole('button', { name: 'My Assistant' })
    expect(button).toHaveAttribute('aria-label', 'My Assistant')
  })

  it('sets empty alt when withTooltip is false (img variant)', () => {
    const { container } = render(<Avatar name="My Assistant" withTooltip={false} />)

    // alt="" means presentation role, query via DOM
    const img = getImg(container)
    expect(img).toHaveAttribute('alt', '')
  })
})
