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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { mockAPI } from '@/test-utils/integration'
import api from '@/utils/api'

describe('api.handleSessionExpired — postLoginRedirect integration', () => {
  // jsdom's window.location is non-configurable — use delete+reassign (same pattern as
  // src/components/appLevel/__tests__/SessionExpiredPopup.test.tsx:52-54)
  const originalLocation = window.location
  const originalConfigs = appInfoStore.configs
  const mockAssign = vi.fn()

  function stubLocation(pathname: string, search = '', hash = '') {
    delete (window as any).location
    // @ts-expect-error: location override for testing
    window.location = { ...originalLocation, pathname, search, hash, assign: mockAssign }
  }

  beforeEach(() => {
    sessionStorage.clear()
    mockAssign.mockReset()
    // getIsLocalAuth() reads appInfoStore.getIdpProvider(), which looks up the
    // 'idpProvider' config entry — not window._env_. Seed it so the 401 handling
    // path inside makeRequest fires.
    appInfoStore.configs = [{ id: 'idpProvider', settings: { enabled: true, value: 'local' } }]
    stubLocation('/assistants/marketplace/foo', '?ref=share')
    // Register a plain 401 (no MCP / broker auth payload) so handleSessionExpired fires
    mockAPI('GET', 'v1/some-resource', {}, 401)
  })

  afterEach(() => {
    // @ts-expect-error: location override for testing
    window.location = originalLocation
    appInfoStore.configs = originalConfigs
  })

  it('writes postLoginRedirect to sessionStorage before redirecting on 401', async () => {
    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBe(
      '/assistants/marketplace/foo?ref=share'
    )
    expect(mockAssign).toHaveBeenCalledWith('/auth/sign-in')
  })

  it('does NOT write postLoginRedirect when already on the sign-in page', async () => {
    stubLocation('/auth/sign-in')

    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it('does NOT write postLoginRedirect when on the sign-up page', async () => {
    stubLocation('/auth/sign-up')

    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
  })

  it('does NOT write postLoginRedirect on sub-path deployment when on the sign-in page', async () => {
    ;(import.meta.env as Record<string, string>).BASE_URL = '/codemie/'
    stubLocation('/codemie/auth/sign-in')

    await api.get('v1/some-resource').catch(() => {})

    expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    ;(import.meta.env as Record<string, string>).BASE_URL = '/'
  })
})
