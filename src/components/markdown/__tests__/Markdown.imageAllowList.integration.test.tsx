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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { BLOCKED_IMAGE_BADGE_CLASS } from '@/components/BlockedImageBadge/BlockedImageBadge'
import { CONFIG_KEYS } from '@/constants/configKeys'
import { appInfoStore } from '@/store/appInfo'

import Markdown from '../Markdown'

function setAllowedImageDomains(value: string) {
  appInfoStore.configs = [
    { id: CONFIG_KEYS.ALLOWED_IMAGE_DOMAINS, settings: { enabled: true, value } },
  ]
}

beforeEach(() => {
  appInfoStore.configs = []
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The chat display path: Markdown -> getMarkdownTokens -> MarkdownTokens -> sanitizer.
 * Image blocking happens in the DOMPurify hook, so this asserts the user-facing result
 * rather than the renderer internals.
 */
describe('Markdown display path — image allow-list', () => {
  it('renders the blocked badge and no <img> for an off-list markdown image', () => {
    const { container } = render(<Markdown content="![alt](https://evil.com/img.png)" />)
    expect(container.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).toBeInTheDocument()
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('names the blocked host in the badge', () => {
    const { container } = render(<Markdown content="![alt](https://evil.com/img.png)" />)
    const badge = container.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)
    expect(badge?.getAttribute('data-blocked-image-hostname')).toBe('evil.com')
  })

  it('renders <img> once the domain is on the customer-config allow-list', () => {
    setAllowedImageDomains('cdn.trusted.com')
    const { container } = render(<Markdown content="![alt](https://cdn.trusted.com/img.png)" />)
    expect(container.querySelector('img')).toBeInTheDocument()
    expect(container.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).not.toBeInTheDocument()
  })

  it('blocks an image inside a table cell', () => {
    const table = ['| h |', '| --- |', '| ![alt](https://evil.com/img.png) |'].join('\n')
    const { container } = render(<Markdown content={table} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector(`.${BLOCKED_IMAGE_BADGE_CLASS}`)).toBeInTheDocument()
  })
})
