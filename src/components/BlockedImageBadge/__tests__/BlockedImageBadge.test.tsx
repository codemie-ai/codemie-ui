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

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import BlockedImageBadge, {
  BLOCKED_IMAGE_BADGE_CLASS,
  BLOCKED_IMAGE_BADGE_CLASS_NAME,
  BLOCKED_IMAGE_BADGE_TITLE,
  BLOCKED_IMAGE_ICON_CLASS,
  getBlockedImageLabel,
} from '../BlockedImageBadge'

describe('BlockedImageBadge', () => {
  it('renders nothing for blank src', () => {
    const { container } = render(<BlockedImageBadge src="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders badge with correct hostname, class, title, and label', () => {
    const { container } = render(<BlockedImageBadge src="https://evil.com/img.png" />)
    const span = container.querySelector('span')!
    expect(span).toBeInTheDocument()
    expect(span.className).toBe(BLOCKED_IMAGE_BADGE_CLASS_NAME)
    expect(span.className).toContain(BLOCKED_IMAGE_BADGE_CLASS)
    expect(span.title).toBe(BLOCKED_IMAGE_BADGE_TITLE)
    expect(span.dataset.blockedImageHostname).toBe('evil.com')
    expect(span.textContent).toBe('Image from evil.com blocked')
  })

  it('marks the badge as a chip rather than as body copy', () => {
    const { container } = render(<BlockedImageBadge src="https://evil.com/img.png" />)
    const span = container.querySelector('span')!
    // the treatment that separates the badge from the prose it sits in
    expect(span.className).toContain('border-dashed')
    expect(span.className).toContain('font-mono')
  })

  it('renders a decorative icon that adds no text for screen readers', () => {
    const { container } = render(<BlockedImageBadge src="https://evil.com/img.png" />)
    const icon = container.querySelector('svg')!
    expect(icon).toBeInTheDocument()
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.textContent).toBe('')
  })

  // `.markdown … p :not(.code-block)` styles every descendant of a rendered paragraph. Its
  // margin-bottom made the icon's margin box fill the flex line, pushing the glyph above the
  // label, and its font-size silently resized the chip. Both need to lose to the badge's own type.
  it('keeps the icon immune to the markdown paragraph styles it renders inside', () => {
    const { container } = render(<BlockedImageBadge src="https://evil.com/img.png" />)
    const icon = container.querySelector('svg')!
    expect(icon.getAttribute('class')).toBe(BLOCKED_IMAGE_ICON_CLASS)
    expect(icon.getAttribute('class')).toContain('!m-0')
    expect(BLOCKED_IMAGE_BADGE_CLASS_NAME).toContain('!text-xs')
    expect(BLOCKED_IMAGE_BADGE_CLASS_NAME).toContain('!leading-5')
  })
})

describe('getBlockedImageLabel', () => {
  it('returns hostname-specific label when hostname provided', () => {
    expect(getBlockedImageLabel('cdn.evil.com')).toBe('Image from cdn.evil.com blocked')
  })

  it('returns fallback label when hostname is undefined', () => {
    expect(getBlockedImageLabel()).toBe('Image from untrusted domain blocked')
  })
})
