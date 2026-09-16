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

import { extractHostname, isImageAllowed } from '@/utils/imageAllowList'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'http://localhost/api',
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
  handleError: vi.fn(),
}))

const mockConfig = vi.hoisted(() => ({ allowedImageDomains: '' }))

vi.mock('@/utils/api', () => ({ default: mockApi }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getAllowedImageDomains: () => mockConfig.allowedImageDomains },
}))

function stubProductionLocation() {
  vi.stubGlobal('location', {
    hostname: 'production.example.com',
    origin: 'https://production.example.com',
    href: 'https://production.example.com/',
  })
}

function stubLocalLocation() {
  vi.stubGlobal('location', {
    hostname: 'localhost',
    origin: 'http://localhost',
    href: 'http://localhost/',
  })
}

beforeEach(() => {
  mockApi.BASE_URL = 'http://localhost/api'
  mockConfig.allowedImageDomains = ''
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isImageAllowed — tier 1: blank', () => {
  it('blocks empty string', () => {
    expect(isImageAllowed('')).toBe(false)
  })

  it('blocks whitespace-only string', () => {
    expect(isImageAllowed('   ')).toBe(false)
  })
})

describe('isImageAllowed — tier 2: data:image/*', () => {
  it('allows data:image/png', () => {
    expect(isImageAllowed('data:image/png;base64,abc123==')).toBe(true)
  })

  it('allows data:image/svg+xml', () => {
    expect(isImageAllowed('data:image/svg+xml,%3Csvg%3E%3C/svg%3E')).toBe(true)
  })

  it('allows data:image/png with leading whitespace (trimmed at entry)', () => {
    expect(isImageAllowed(' data:image/png;base64,abc123==')).toBe(true)
  })

  it('blocks data:text/html (not data:image)', () => {
    expect(isImageAllowed('data:text/html;base64,PHNjcmlwdD4=')).toBe(false)
  })
})

describe('isImageAllowed — tier 3: malformed URL', () => {
  beforeEach(() => stubProductionLocation())

  it('blocks a malformed IPv6 authority URL that cannot be parsed', () => {
    expect(isImageAllowed('https://[invalid-bracket')).toBe(false)
  })
})

describe('isImageAllowed — tier 4: scheme', () => {
  beforeEach(() => stubProductionLocation())

  it('blocks blob: URL', () => {
    expect(isImageAllowed('blob:https://example.com/some-id')).toBe(false)
  })

  it('blocks protocol-relative //evil.com/x.png on production page (resolves to https:, blocked at tier 8)', () => {
    mockApi.BASE_URL = 'https://api.example.com'
    expect(isImageAllowed('//evil.com/x.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 5: http: only on local page', () => {
  it('blocks http://evil.com on an HTTPS production page', () => {
    stubProductionLocation()
    expect(isImageAllowed('http://evil.com/img.png')).toBe(false)
  })

  it('allows http://localhost/img.png on a local page (hostname=localhost)', () => {
    stubLocalLocation()
    expect(isImageAllowed('http://localhost/img.png')).toBe(true)
  })

  it('allows http://127.0.0.1/img.png on a local page (hostname=127.0.0.1)', () => {
    vi.stubGlobal('location', {
      hostname: '127.0.0.1',
      origin: 'http://127.0.0.1',
      href: 'http://127.0.0.1/',
    })
    expect(isImageAllowed('http://127.0.0.1/img.png')).toBe(true)
  })

  it('blocks http://localhost/img.png on a production page', () => {
    stubProductionLocation()
    expect(isImageAllowed('http://localhost/img.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 6: same-origin', () => {
  it('allows a same-origin absolute URL', () => {
    stubLocalLocation()
    expect(isImageAllowed('http://localhost/static/img.png')).toBe(true)
  })

  it('allows a same-origin relative URL resolved against href', () => {
    stubLocalLocation()
    expect(isImageAllowed('/api/v1/files/abc.png')).toBe(true)
  })
})

describe('isImageAllowed — tier 7: backend origin', () => {
  it('allows an image from the backend origin (absolute VITE_API_URL)', () => {
    stubProductionLocation()
    mockApi.BASE_URL = 'https://codemie.example.com/code-assistant-api'
    expect(isImageAllowed('https://codemie.example.com/code-assistant-api/v1/files/img.png')).toBe(
      true
    )
  })
})

describe('isImageAllowed — tier 8: empty allow-list', () => {
  beforeEach(() => {
    stubProductionLocation()
    mockApi.BASE_URL = 'https://api.example.com'
  })

  it('blocks external https:// URL when allow-list is empty', () => {
    expect(isImageAllowed('https://external.com/img.png')).toBe(false)
  })

  it('blocks external https:// URL while customer config has not been fetched yet', () => {
    // getAllowedImageDomains() returns '' until GET /v1/config resolves — fail closed
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(false)
  })
})

describe('isImageAllowed — tier 9: allow-list matching', () => {
  beforeEach(() => {
    stubProductionLocation()
    mockApi.BASE_URL = 'https://api.example.com'
  })

  it('allows exact match in list', () => {
    mockConfig.allowedImageDomains = 'cdn.example.com'
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
  })

  it('picks up a customer config value that arrives after the first check', () => {
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(false)
    mockConfig.allowedImageDomains = 'cdn.example.com'
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com matches apex example.com', () => {
    mockConfig.allowedImageDomains = '.example.com'
    expect(isImageAllowed('https://example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com matches sub.example.com', () => {
    mockConfig.allowedImageDomains = '.example.com'
    expect(isImageAllowed('https://sub.example.com/img.png')).toBe(true)
  })

  it('leading-dot wildcard .example.com rejects evil-example.com', () => {
    mockConfig.allowedImageDomains = '.example.com'
    expect(isImageAllowed('https://evil-example.com/img.png')).toBe(false)
  })

  it('leading-dot wildcard .example.com rejects example.com.evil.io', () => {
    mockConfig.allowedImageDomains = '.example.com'
    expect(isImageAllowed('https://example.com.evil.io/img.png')).toBe(false)
  })

  it('allow-list entry with extra whitespace and mixed case is normalized', () => {
    mockConfig.allowedImageDomains = '  CDN.EXAMPLE.COM  '
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
  })

  it('single-label entry .com is rejected — does not allow all .com hostnames', () => {
    mockConfig.allowedImageDomains = '.com'
    expect(isImageAllowed('https://evil.com/img.png')).toBe(false)
  })

  it('single-label entry com is rejected', () => {
    mockConfig.allowedImageDomains = 'com'
    expect(isImageAllowed('https://evil.com/img.png')).toBe(false)
  })

  it('keeps the valid entries of a list that also contains a single-label entry', () => {
    mockConfig.allowedImageDomains = 'com,cdn.example.com'
    expect(isImageAllowed('https://cdn.example.com/img.png')).toBe(true)
    expect(isImageAllowed('https://evil.com/img.png')).toBe(false)
  })
})

describe('extractHostname', () => {
  beforeEach(() => stubProductionLocation())

  it('returns the hostname of a parseable URL', () => {
    expect(extractHostname('https://evil.com/img.png')).toBe('evil.com')
  })

  it('returns undefined for a blank src', () => {
    expect(extractHostname('  ')).toBeUndefined()
  })

  it('returns undefined for an unparseable URL', () => {
    expect(extractHostname('https://[invalid-bracket')).toBeUndefined()
  })
})
