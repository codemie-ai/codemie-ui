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
import { describe, it, expect } from 'vitest'

import { navigate, renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

const TEST_USERNAME = 'John Doe'
const TEST_EMAIL = 'test@example.com'
const TEST_VALID_PASSWORD = 'Password123'

describe('SignUpPage — Integration', () => {
  const fillAndSubmit = async () => {
    const user = userEvent.setup()
    renderPage('/auth/sign-up')

    await user.type(screen.getByLabelText('Username'), TEST_USERNAME)
    await user.type(screen.getByLabelText('Email address'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_VALID_PASSWORD)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create account' })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: 'Create account' }))
  }

  it('renders sign up page with all required elements', () => {
    renderPage('/auth/sign-up')

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByText('Create an account to get started.')).toBeInTheDocument()
  })

  it('navigates to /auth/sign-in when "Sign In" header button is clicked', async () => {
    const user = userEvent.setup()
    renderPage('/auth/sign-up')

    await user.click(screen.getByRole('button', { name: 'Sign In' }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/auth/sign-in')
    })
  })

  it('navigates to / on successful registration', async () => {
    mockAPI('POST', 'v1/local-auth/register', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows error toast when register API fails with a generic error', async () => {
    mockAPI('POST', 'v1/local-auth/register', { error: { message: 'Email already in use' } }, 401)

    await fillAndSubmit()

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Email already in use')
    })
  })

  it('shows validation error toast and sets field errors on API validation failure', async () => {
    mockAPI(
      'POST',
      'v1/local-auth/register',
      {
        error: {
          details: [
            { loc: ['body', 'email'], msg: 'email already registered' },
            { loc: ['body', 'username'], msg: 'username already taken' },
          ],
        },
      },
      422
    )

    await fillAndSubmit()

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith(
        expect.stringContaining('Email already registered')
      )
    })

    await waitFor(() => {
      expect(screen.getByText('email already registered')).toBeInTheDocument()
    })
  })
})
