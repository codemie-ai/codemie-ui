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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SignInForm from '../SignInForm'
import {
  fillEmailAndPassword,
  getFormInputs,
  testPasswordToggle,
  expectInputsDisabled,
  expectAriaLabel,
  expectAriaRequired,
  getPasswordToggle,
  TEST_EMAIL,
  TEST_PASSWORD,
  TEST_PASSWORD_ANY,
} from './testUtils'

const mockOnSubmit = vi.fn()

const renderComponent = (props = {}) => {
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
  }

  return render(<SignInForm {...defaultProps} {...props} />)
}

let user

describe('SignInForm', () => {
  beforeEach(() => {
    user = userEvent.setup()
    mockOnSubmit.mockClear()
  })

  describe('rendering', () => {
    it('renders form with email and password inputs', () => {
      renderComponent()

      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign in to your account' })).toBeInTheDocument()
    })

    it('renders submit button with correct text', () => {
      renderComponent()

      expect(screen.getByText('Sign In')).toBeInTheDocument()
    })

    it('submit button is disabled initially', () => {
      renderComponent()

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('email validation', () => {
    it('keeps submit disabled with invalid email', async () => {
      renderComponent()

      await fillEmailAndPassword(user, 'invalid-email', TEST_PASSWORD)

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit with valid email format', async () => {
      renderComponent()

      await fillEmailAndPassword(user, TEST_EMAIL, TEST_PASSWORD)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('password validation', () => {
    it('keeps submit disabled without password', async () => {
      renderComponent()

      const { emailInput } = getFormInputs()
      await user.type(emailInput, TEST_EMAIL)

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit with any non-empty password', async () => {
      renderComponent()

      await fillEmailAndPassword(user, TEST_EMAIL, TEST_PASSWORD_ANY)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('password visibility toggle', () => {
    it('toggles password visibility when button is clicked', async () => {
      renderComponent()

      const { passwordInput } = getFormInputs()
      await testPasswordToggle(user, passwordInput as HTMLInputElement)
    })
  })

  describe('form submission', () => {
    it('calls onSubmit with valid data', async () => {
      renderComponent()

      await fillEmailAndPassword(user, TEST_EMAIL, TEST_PASSWORD)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
        expect(submitButton).not.toBeDisabled()
      })

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
          },
          expect.any(Function)
        )
      })
    })

    it('does not submit form with invalid data', async () => {
      renderComponent()

      const { emailInput } = getFormInputs()
      await user.type(emailInput, 'invalid-email')

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      expect(submitButton).toBeDisabled()

      await user.click(submitButton)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('resets form after successful submission', async () => {
      mockOnSubmit.mockImplementation((_data, reset) => {
        reset()
      })

      renderComponent()

      const { emailInput, passwordInput } = getFormInputs()
      await fillEmailAndPassword(user, TEST_EMAIL, TEST_PASSWORD)

      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })
      await user.click(submitButton)

      await waitFor(() => {
        expect((emailInput as HTMLInputElement).value).toBe('')
        expect((passwordInput as HTMLInputElement).value).toBe('')
      })
    })
  })

  describe('loading state', () => {
    it('disables all inputs when loading', () => {
      renderComponent({ isLoading: true })

      const { emailInput, passwordInput } = getFormInputs()
      const submitButton = screen.getByRole('button', { name: 'Sign in to your account' })

      expectInputsDisabled(emailInput, passwordInput, submitButton)
    })

    it('disables password toggle when loading', () => {
      renderComponent({ isLoading: true })

      const toggleButton = getPasswordToggle()
      expect(toggleButton).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has correct aria-labels', () => {
      renderComponent()

      const { emailInput, passwordInput } = getFormInputs()
      expectAriaLabel(emailInput, 'Email address')
      expectAriaLabel(passwordInput, 'Password')
    })

    it('marks required fields with aria-required', () => {
      renderComponent()

      const { emailInput, passwordInput } = getFormInputs()
      expectAriaRequired(emailInput, passwordInput)
    })
  })
})
