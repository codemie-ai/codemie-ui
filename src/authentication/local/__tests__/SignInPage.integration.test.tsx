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

const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'password123'
const TEST_WRONG_PASSWORD = 'wrongpassword'

describe('SignInPage — Integration', () => {
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

  it('navigates to / on successful login', async () => {
    mockAPI('POST', 'v1/local-auth/login', {})

    await fillAndSubmit()

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/')
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
