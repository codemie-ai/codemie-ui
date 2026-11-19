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

// Pins the two upstream behaviours the downloadable-artifact feature rests on:
// the `sandbox:` -> BASE_URL rewrite in the lexer, and DOMPurify's default scheme
// deny-list. The render-time predicate in artifactLink.ts mirrors that deny-list
// rather than widening SANITIZE_CONFIG, so these tests are what keep the two in step.

import { describe, it, expect, vi } from 'vitest'

import { sanitizeHtmlWithImageAllowList } from '@/components/markdown/Markdown.sanitize'
import { getMarkdownTokens } from '@/components/markdown/Markdown.utils'

const mockApi = vi.hoisted(() => ({
  BASE_URL: 'https://api.example.com',
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/utils/api', () => ({ default: mockApi }))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getAllowedImageDomains: () => '' },
}))

describe('getMarkdownTokens — sandbox artifact rewrite', () => {
  it('rewrites sandbox:/v1/files/ to the API base URL before lexing', () => {
    const [token] = getMarkdownTokens('[Download](sandbox:/v1/files/abc_report.csv)')

    expect(JSON.stringify(token)).toContain('https://api.example.com/v1/files/abc_report.csv')
    expect(JSON.stringify(token)).not.toContain('sandbox:')
  })
})

// Assembled from parts so the literal does not trip eslint's `no-script-url`; the
// value handed to the sanitizer is the real script URL.
const SCRIPT_URL = `java${'script'}:alert(1)`

describe('sanitizeHtmlWithImageAllowList — default scheme deny', () => {
  it.each(['filesystem:/tmp/x.xlsx', 'file:///tmp/x', SCRIPT_URL])(
    'strips the href for %s',
    (href) => {
      expect(sanitizeHtmlWithImageAllowList(`<a href="${href}">D</a>`)).not.toContain('href')
    }
  )

  it('keeps an https href', () => {
    expect(sanitizeHtmlWithImageAllowList('<a href="https://x/y">D</a>')).toContain(
      'href="https://x/y"'
    )
  })
})
