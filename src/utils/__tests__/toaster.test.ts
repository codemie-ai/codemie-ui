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

import Toastify from 'toastify-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// setupTests.tsx mocks the whole toaster module for every other suite. Undo it here — this suite
// exercises the real toaster implementation.
vi.unmock('@/utils/toaster')

vi.mock('toastify-js', () => ({
  default: vi.fn().mockReturnValue({ showToast: vi.fn() }),
}))

const { default: toaster, setToasterAnnouncer } = await vi.importActual<
  typeof import('../toaster')
>('../toaster')

describe('toaster XSS prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('strips <script> payload injected via API error details', () => {
    toaster.error('An error occurred<br> <script>alert(document.cookie)</script>')

    const callArg = (Toastify as ReturnType<typeof vi.fn>).mock.calls[0][0] as { text: string }
    expect(callArg.text).not.toContain('<script>')
    expect(callArg.text).not.toContain('alert')
  })

  it('strips img tag entirely from toast content', () => {
    toaster.error('An error occurred<br> <img src=x onerror=alert(document.cookie)>')

    const callArg = (Toastify as ReturnType<typeof vi.fn>).mock.calls[0][0] as { text: string }
    expect(callArg.text).not.toContain('<img')
    expect(callArg.text).not.toContain('onerror')
  })
})

describe('toaster announcer', () => {
  const announcer = vi.fn()

  beforeEach(() => {
    announcer.mockClear()
    setToasterAnnouncer(announcer)
  })

  afterEach(() => {
    setToasterAnnouncer(null)
  })

  it('announces the plain text of a success toast', () => {
    toaster.success('User name copied to clipboard')
    expect(announcer).toHaveBeenCalledWith('User name copied to clipboard')
  })

  it('announces the plain text of an info toast', () => {
    toaster.info('Ready')
    expect(announcer).toHaveBeenCalledWith('Ready')
  })

  it('announces the plain text of an error toast', () => {
    toaster.error('Failed to save')
    expect(announcer).toHaveBeenCalledWith('Failed to save')
  })

  it('does not announce empty text', () => {
    toaster.success('')
    expect(announcer).not.toHaveBeenCalled()
  })

  it('does not throw and does not announce after the announcer is cleared', () => {
    setToasterAnnouncer(null)
    expect(() => toaster.success('after unmount')).not.toThrow()
    expect(announcer).not.toHaveBeenCalled()
  })

  it('strips the <br> separator and residual tags before announcing', () => {
    toaster.error('Error title<br>Error details <script>x</script>')
    expect(announcer).toHaveBeenCalledWith('Error title Error details x')
  })

  it('guarded clear does not evict a fresher announcer registration', () => {
    const stale = vi.fn()
    const fresh = vi.fn()
    setToasterAnnouncer(stale)
    setToasterAnnouncer(fresh)
    // Simulate the stale instance's cleanup: it should not evict `fresh`.
    setToasterAnnouncer(null, stale)
    toaster.success('should reach fresh')
    expect(fresh).toHaveBeenCalledWith('should reach fresh')
    expect(stale).not.toHaveBeenCalled()
  })

  it('guarded clear clears when the current announcer matches', () => {
    const fn = vi.fn()
    setToasterAnnouncer(fn)
    setToasterAnnouncer(null, fn)
    toaster.success('should not reach fn')
    expect(fn).not.toHaveBeenCalled()
  })
})
