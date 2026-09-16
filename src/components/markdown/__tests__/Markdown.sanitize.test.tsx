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
import DOMPurify from 'dompurify'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import BlockedImageBadge, {
  BLOCKED_IMAGE_BADGE_CLASS,
  BLOCKED_IMAGE_BADGE_TITLE,
} from '@/components/BlockedImageBadge/BlockedImageBadge'
import { sanitizeHtmlWithImageAllowList } from '@/components/markdown/Markdown.sanitize'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

const mockConfig = vi.hoisted(() => ({ allowedImageDomains: 'cdn.trusted.com' }))

vi.mock('@/utils/api', () => ({ default: mockApi }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getAllowedImageDomains: () => mockConfig.allowedImageDomains },
}))

const parse = (html: string): HTMLDivElement => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

beforeEach(() => {
  mockApi.BASE_URL = 'https://api.example.com'
  mockConfig.allowedImageDomains = 'cdn.trusted.com'
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sanitizeHtmlWithImageAllowList', () => {
  it('replaces a raw <img> from a blocked domain with the blocked-image badge', () => {
    const result = sanitizeHtmlWithImageAllowList('<p><img src="https://evil.com/x.png"></p>')
    expect(result).not.toContain('<img')
    const badge = parse(result).querySelector(`span.${BLOCKED_IMAGE_BADGE_CLASS}`)
    expect(badge?.getAttribute('data-blocked-image-hostname')).toBe('evil.com')
    expect(badge?.getAttribute('title')).toBe(BLOCKED_IMAGE_BADGE_TITLE)
    expect(badge?.textContent).toBe('Image from evil.com blocked')
  })

  it('keeps a raw <img> whose src is on the allow-list', () => {
    const result = sanitizeHtmlWithImageAllowList('<img src="https://cdn.trusted.com/x.png">')
    expect(parse(result).querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.trusted.com/x.png'
    )
    expect(result).not.toContain(BLOCKED_IMAGE_BADGE_CLASS)
  })

  it('blocks an <img> whose srcset contains a candidate from a blocked domain', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<img src="https://cdn.trusted.com/x.png" srcset="https://cdn.trusted.com/x.png 1x, https://evil.com/x2.png 2x">'
    )
    expect(result).not.toContain('<img')
    expect(result).toContain(BLOCKED_IMAGE_BADGE_CLASS)
  })

  it('keeps an <img> whose srcset candidates are all allowed', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<img src="https://cdn.trusted.com/x.png" srcset="https://cdn.trusted.com/x2.png 2x">'
    )
    expect(parse(result).querySelector('img')?.getAttribute('srcset')).toBe(
      'https://cdn.trusted.com/x2.png 2x'
    )
  })

  it('removes a <source> element whose srcset is blocked but keeps the allowed <img> fallback', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<picture><source srcset="https://evil.com/x.png"><img src="https://cdn.trusted.com/x.png"></picture>'
    )
    const div = parse(result)
    expect(div.querySelector('source')).toBeNull()
    expect(div.querySelector('img')?.getAttribute('src')).toBe('https://cdn.trusted.com/x.png')
  })

  it('strips a blocked poster attribute from <video>', () => {
    const result = sanitizeHtmlWithImageAllowList('<video poster="https://evil.com/p.png"></video>')
    expect(parse(result).querySelector('video')?.hasAttribute('poster')).toBe(false)
  })

  it('strips a blocked background attribute', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<table background="https://evil.com/b.png"><tr><td>x</td></tr></table>'
    )
    expect(parse(result).querySelector('table')?.hasAttribute('background')).toBe(false)
  })

  it('keeps an allowed poster attribute', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<video poster="https://cdn.trusted.com/p.png"></video>'
    )
    expect(parse(result).querySelector('video')?.getAttribute('poster')).toBe(
      'https://cdn.trusted.com/p.png'
    )
  })

  it('still removes scripts like a plain DOMPurify sanitize', () => {
    const result = sanitizeHtmlWithImageAllowList('<p>hi</p><script>alert(1)</script>')
    expect(result).toContain('<p>hi</p>')
    expect(result).not.toContain('<script')
  })

  it('keeps target="_blank" on links, which DOMPurify strips by default', () => {
    const result = sanitizeHtmlWithImageAllowList(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>'
    )
    expect(parse(result).querySelector('a')?.getAttribute('target')).toBe('_blank')
  })

  it('drops an <img> with a blank src without emitting an empty badge', () => {
    const result = sanitizeHtmlWithImageAllowList('<p>a<img src="">b</p>')
    expect(result).not.toContain('<img')
    expect(result).not.toContain(BLOCKED_IMAGE_BADGE_CLASS)
    expect(parse(result).textContent).toBe('ab')
  })

  it('does not register a hook on the global DOMPurify used for user-authored content', () => {
    sanitizeHtmlWithImageAllowList('<img src="https://evil.com/x.png">')
    expect(DOMPurify.sanitize('<img src="https://evil.com/x.png">')).toContain('<img')
  })
})

describe('drift prevention: the DOM badge matches the React BlockedImageBadge', () => {
  it('matches tagName, className, dataset, title, textContent', () => {
    const src = 'https://evil.com/img.png'
    const fromHtml = parse(sanitizeHtmlWithImageAllowList(`<img src="${src}">`))
      .firstElementChild as HTMLElement

    const { container } = render(<BlockedImageBadge src={src} />)
    const fromReact = container.firstElementChild as HTMLElement

    expect(fromReact.tagName).toBe(fromHtml.tagName)
    expect(fromReact.className).toBe(fromHtml.className)
    expect(fromReact.dataset.blockedImageHostname).toBe(fromHtml.dataset.blockedImageHostname)
    expect(fromReact.title).toBe(fromHtml.title)
    expect(fromReact.textContent).toBe(fromHtml.textContent)
  })

  it('carries the same decorative icon on both paths', () => {
    const src = 'https://evil.com/img.png'
    const iconFromHtml = parse(sanitizeHtmlWithImageAllowList(`<img src="${src}">`)).querySelector(
      'svg'
    )
    const { container } = render(<BlockedImageBadge src={src} />)
    const iconFromReact = container.querySelector('svg')

    expect(iconFromHtml).not.toBeNull()
    expect(iconFromReact).not.toBeNull()
    // same asset, so the artwork itself has to match — the sanitizer must not strip it
    expect(iconFromHtml?.getAttribute('viewBox')).toBe(iconFromReact?.getAttribute('viewBox'))
    // the icon carries its own sizing/margin reset; if only one path got it the two would misalign
    expect(iconFromHtml?.getAttribute('class')).toBe(iconFromReact?.getAttribute('class'))
    expect(iconFromHtml?.querySelectorAll('path')).toHaveLength(
      iconFromReact?.querySelectorAll('path').length ?? 0
    )
  })
})
