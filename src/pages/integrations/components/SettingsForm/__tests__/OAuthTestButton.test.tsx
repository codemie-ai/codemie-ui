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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'
import toaster from '@/utils/toaster'

import OAuthTestButton from '../OAuthTestButton'

const handleSignIn = vi.fn()
let mockReturn: {
  status: OAuthStatus
  user: string
  error: string
  handleSignIn: typeof handleSignIn
}

vi.mock('@/hooks/useToolOAuthTest', () => ({ useToolOAuthTest: () => mockReturn }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

const props = { provider: OAuthProvider.GITLAB, initiate: vi.fn() }

describe('OAuthTestButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturn = { status: OAuthStatus.IDLE, user: '', error: '', handleSignIn }
  })

  it('runs the OAuth flow when clicked', async () => {
    render(<OAuthTestButton {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /^test$/i }))
    expect(handleSignIn).toHaveBeenCalledTimes(1)
  })

  it('toasts success with the authenticated user', () => {
    const { rerender } = render(<OAuthTestButton {...props} />)
    mockReturn = { status: OAuthStatus.SUCCESS, user: 'groot', error: '', handleSignIn }
    rerender(<OAuthTestButton {...props} />)
    expect(toaster.info).toHaveBeenCalledWith(expect.stringContaining('groot'))
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('toasts the error message on failure', () => {
    const { rerender } = render(<OAuthTestButton {...props} />)
    mockReturn = { status: OAuthStatus.ERROR, user: '', error: 'bad creds', handleSignIn }
    rerender(<OAuthTestButton {...props} />)
    expect(toaster.error).toHaveBeenCalledWith('bad creds')
    expect(toaster.info).not.toHaveBeenCalled()
  })
})
