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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { BLOCKED_IMAGE_BADGE_CLASS } from '@/components/BlockedImageBadge/BlockedImageBadge'
import { markdown2html } from '@/components/markdown/Markdown.utils'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

const mockConfig = vi.hoisted(() => ({ allowedImageDomains: '' }))

vi.mock('@/utils/api', () => ({ default: mockApi }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getAllowedImageDomains: () => mockConfig.allowedImageDomains },
}))

beforeEach(() => {
  mockApi.BASE_URL = 'https://api.example.com'
  mockConfig.allowedImageDomains = ''
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('markdown2html — image allow-list integration', () => {
  it('emits badge HTML for a blocked markdown image', () => {
    const html = markdown2html('![alt](https://evil.com/img.png)')
    expect(html).toContain(BLOCKED_IMAGE_BADGE_CLASS)
    expect(html).not.toContain('<img')
  })

  it('emits badge HTML for a raw <img> tag from a blocked domain', () => {
    const html = markdown2html('<img src="https://evil.com/img.png">')
    expect(html).toContain(BLOCKED_IMAGE_BADGE_CLASS)
    expect(html).not.toContain('<img')
  })

  it('keeps a markdown image from a domain on the allow-list', () => {
    mockConfig.allowedImageDomains = 'cdn.trusted.com'
    const html = markdown2html('![alt](https://cdn.trusted.com/img.png)')
    expect(html).toContain('<img')
    expect(html).not.toContain(BLOCKED_IMAGE_BADGE_CLASS)
  })

  it('keeps a raw <img> tag from a domain on the allow-list', () => {
    mockConfig.allowedImageDomains = 'cdn.trusted.com'
    const html = markdown2html('<img src="https://cdn.trusted.com/img.png">')
    expect(html).toContain('<img')
    expect(html).not.toContain(BLOCKED_IMAGE_BADGE_CLASS)
  })

  it('keeps target="_blank" on rendered links', () => {
    const html = markdown2html('[x](https://example.com)')
    expect(html).toContain('target="_blank"')
  })
})
