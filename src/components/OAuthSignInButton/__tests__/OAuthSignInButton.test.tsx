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
import { describe, it, expect, vi } from 'vitest'

import { OAuthProvider, OAuthStatus } from '@/types/entity/dataSource'

import OAuthSignInButton from '../OAuthSignInButton'

describe('OAuthSignInButton', () => {
  const defaultProps = {
    provider: OAuthProvider.GOOGLE,
    onSignIn: vi.fn(),
    onReauthenticate: vi.fn(),
    onCancel: vi.fn(),
  }

  it('IDLE: renders "Sign in with Google" button', () => {
    render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.IDLE} />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('IDLE: calls onSignIn when button is clicked', async () => {
    const onSignIn = vi.fn()
    render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.IDLE} onSignIn={onSignIn} />)
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(onSignIn).toHaveBeenCalledOnce()
  })

  it('WAITING: shows waiting message and disabled button', () => {
    render(<OAuthSignInButton {...defaultProps} status={OAuthStatus.WAITING} />)
    expect(
      screen.getByText(/sign-in window opened — complete authentication in the browser/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /waiting for sign-in/i })).toBeInTheDocument()
  })

  it('SUCCESS: shows email and Re-authenticate button', () => {
    render(
      <OAuthSignInButton {...defaultProps} status={OAuthStatus.SUCCESS} user="user@example.com" />
    )
    expect(screen.getByText('Signed in as: user@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /re-authenticate/i })).toBeInTheDocument()
  })

  it('SUCCESS: Re-authenticate button calls onReauthenticate', async () => {
    const onReauthenticate = vi.fn()
    render(
      <OAuthSignInButton
        {...defaultProps}
        status={OAuthStatus.SUCCESS}
        user="user@example.com"
        onReauthenticate={onReauthenticate}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /re-authenticate/i }))
    expect(onReauthenticate).toHaveBeenCalledOnce()
  })

  it('ERROR: shows error message and Sign in button', () => {
    render(
      <OAuthSignInButton
        {...defaultProps}
        status={OAuthStatus.ERROR}
        authError="Pop-up blocked — please allow pop-ups for this site."
      />
    )
    expect(screen.getByText(/pop-up blocked/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('ERROR: Sign in button calls onSignIn', async () => {
    const onSignIn = vi.fn()
    render(
      <OAuthSignInButton
        {...defaultProps}
        status={OAuthStatus.ERROR}
        authError="Something went wrong"
        onSignIn={onSignIn}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(onSignIn).toHaveBeenCalledOnce()
  })
})
