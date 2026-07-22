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

import { afterEach, describe, expect, it } from 'vitest'

import { consumePostLoginRedirect, savePostLoginRedirect } from '@/utils/postLoginRedirect'

describe('postLoginRedirect', () => {
  // jsdom's window.location is non-configurable — use delete+reassign (same pattern as
  // src/components/appLevel/__tests__/SessionExpiredPopup.test.tsx:52-54)
  const originalLocation = window.location

  function stubLocation(pathname: string, search = '', hash = '') {
    delete (window as any).location
    // @ts-expect-error: location override for testing
    window.location = { ...originalLocation, pathname, search, hash }
  }

  afterEach(() => {
    sessionStorage.clear()
    // @ts-expect-error: location override for testing
    window.location = originalLocation
    ;(import.meta.env as Record<string, string>).BASE_URL = '/'
  })

  // ─── savePostLoginRedirect ────────────────────────────────────────────────

  describe('savePostLoginRedirect', () => {
    it('stores pathname+search+hash as-is on a root deployment (BASE_URL="/")', () => {
      ;(import.meta.env as Record<string, string>).BASE_URL = '/'
      stubLocation('/assistants/marketplace/foo', '?ref=share', '#top')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBe(
        '/assistants/marketplace/foo?ref=share#top'
      )
    })

    it('strips the BASE_URL prefix on a sub-path deployment (BASE_URL="/codemie/")', () => {
      ;(import.meta.env as Record<string, string>).BASE_URL = '/codemie/'
      stubLocation('/codemie/assistants/marketplace/foo', '?ref=share', '')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBe(
        '/assistants/marketplace/foo?ref=share'
      )
    })

    it('does NOT strip a path that shares the prefix string but is not under it (e.g. /codemie-extra)', () => {
      ;(import.meta.env as Record<string, string>).BASE_URL = '/codemie/'
      stubLocation('/codemie-extra/page')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBe('/codemie-extra/page')
    })

    it('does NOT write to sessionStorage when the path is "/"', () => {
      stubLocation('/', '', '')

      savePostLoginRedirect()

      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })
  })

  // ─── consumePostLoginRedirect ─────────────────────────────────────────────

  describe('consumePostLoginRedirect', () => {
    it('returns the stored value and removes the key', () => {
      sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/foo')

      const result = consumePostLoginRedirect()

      expect(result).toBe('/assistants/marketplace/foo')
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })

    it('returns null when no key is set', () => {
      expect(consumePostLoginRedirect()).toBeNull()
    })

    it('rejects a protocol-relative URL ("//evil.com/path") and returns null', () => {
      sessionStorage.setItem('postLoginRedirect', '//evil.com/path')

      expect(consumePostLoginRedirect()).toBeNull()
    })

    it('rejects a backslash-relative URL ("/\\evil") and returns null', () => {
      sessionStorage.setItem('postLoginRedirect', '/\\evil')

      expect(consumePostLoginRedirect()).toBeNull()
    })
  })
})
