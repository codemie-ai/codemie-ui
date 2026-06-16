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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import toaster from '@/utils/toaster'

// Hoisted by Vitest before module initialization: use real toaster, mock Toastify.
vi.unmock('@/utils/toaster')
vi.mock('toastify-js', () => ({
  default: vi.fn().mockReturnValue({ showToast: vi.fn() }),
}))

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
