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

import { describe, it, expect, vi, afterEach } from 'vitest'

import { openSignInWindow } from '../openSignInWindow'

const AUTH_URL = 'https://idp.example.com/authorize?state=abc'

const createFakeWindow = () => ({ opener: {} as unknown, close: vi.fn(), location: { href: '' } })

const stubWindowOpen = (handle: ReturnType<typeof createFakeWindow> | null) => {
  const open = vi.fn().mockReturnValue(handle)
  vi.stubGlobal('window', { open })
  return open
}

describe('openSignInWindow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens a blank window synchronously, cuts opener and navigates to the auth url', () => {
    const fake = createFakeWindow()
    const open = stubWindowOpen(fake)

    const result = openSignInWindow(AUTH_URL)

    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(result).toEqual({ status: 'opened', window: fake })
    expect(fake.opener).toBeNull()
    expect(fake.location.href).toBe(AUTH_URL)
  })

  it('returns blocked when the browser returns no window handle', () => {
    stubWindowOpen(null)

    expect(openSignInWindow(AUTH_URL)).toEqual({ status: 'blocked' })
  })

  // eslint-disable-next-line no-script-url -- deliberately exercising the rejected scheme
  it.each(['javascript:alert(1)', 'not a url'])(
    'returns invalid_url, closes the window and never navigates for %s',
    (badUrl) => {
      const fake = createFakeWindow()
      stubWindowOpen(fake)

      expect(openSignInWindow(badUrl)).toEqual({ status: 'invalid_url' })
      expect(fake.close).toHaveBeenCalledTimes(1)
      expect(fake.location.href).toBe('')
    }
  )
})
