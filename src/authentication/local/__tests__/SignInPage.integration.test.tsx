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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { navigate, renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'password123'
const TEST_WRONG_PASSWORD = 'wrongpassword'

describe('SignInPage — Integration', () => {
  // jsdom defines location.assign as non-configurable and non-writable, so vi.spyOn cannot
  // replace it. Swap the whole location object instead — window.location IS configurable.
  // Same pattern as src/utils/__tests__/postLoginRedirect.test.ts:29-33.
  const originalLocation = window.location

  function stubLocationAssign() {
    const assign = vi.fn()
    delete (window as any).location
    // @ts-expect-error: location override for testing
    window.location = { ...originalLocation, assign }
    return assign
  }

  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    // @ts-expect-error: location override for testing
    window.location = originalLocation
  })

  const fillAndSubmit = async (password = TEST_PASSWORD) => {
    const user = userEvent.setup()
    renderPage('/auth/sign-in')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), password)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))
  }

  it('renders sign in form with all required elements', () => {
    renderPage('/auth/sign-in')

    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in to your account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByText('Welcome to CodeMie')).toBeInTheDocument()
  })

  it('navigates to / when no postLoginRedirect is stored', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('navigates to stored postLoginRedirect URL after login', async () => {
    sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/foo')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/assistants/marketplace/foo')
    })
  })

  it('navigates to the safe next query parameter after login', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})

    const user = userEvent.setup()
    renderPage('/auth/sign-in?next=%2Fassistants%2Fmarketplace%2Ffoo%3Fref%3Dshare')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/assistants/marketplace/foo?ref=share')
    })
  })

  it('prefers the safe next query parameter over sessionStorage after login', async () => {
    sessionStorage.setItem('postLoginRedirect', '/skills')
    mockAPI('POST', 'v1/local-auth/login', {})

    const user = userEvent.setup()
    renderPage('/auth/sign-in?next=%2Fassistants')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/assistants')
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })
  })

  it('clears postLoginRedirect from sessionStorage after login', async () => {
    sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/foo')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(sessionStorage.getItem('postLoginRedirect')).toBeNull()
    })
  })

  it('falls back to / when stored postLoginRedirect is invalid (open-redirect guard)', async () => {
    sessionStorage.setItem('postLoginRedirect', '//evil.com')
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('falls back to stored postLoginRedirect when next is invalid (open-redirect guard)', async () => {
    sessionStorage.setItem('postLoginRedirect', '/assistants/marketplace/foo')
    mockAPI('POST', 'v1/local-auth/login', {})

    const user = userEvent.setup()
    renderPage('/auth/sign-in?next=%2F%2Fevil.com')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/assistants/marketplace/foo')
    })
  })

  it('hard-redirects via window.location.assign when next does not match a SPA route', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})
    const assignSpy = stubLocationAssign()

    const user = userEvent.setup()
    renderPage('/auth/sign-in?next=%2Fapi%2Fv1%2Fauth%2Flogin%2F54619')

    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Sign in to your account' }))

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith('/api/v1/auth/login/54619')
      expect(navigate).not.toHaveBeenCalled()
    })
  })

  it('shows error toast when login fails', async () => {
    mockAPI('POST', 'v1/local-auth/login', { error: { message: 'Invalid credentials' } }, 401)

    await fillAndSubmit(TEST_WRONG_PASSWORD)

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Invalid credentials')
    })
  })
})
