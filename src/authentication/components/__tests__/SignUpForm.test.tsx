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

import SignUpForm from '../SignUpForm'
import {
  testPasswordToggle,
  expectInputsDisabled,
  expectAriaLabel,
  expectAriaRequired,
  getPasswordToggle,
  fillSignUpForm,
  getSignUpFormInputs,
  getSubmitButton,
  TEST_EMAIL,
  TEST_NAME,
  TEST_VALID_PASSWORD,
  TEST_PASSWORD_NO_NUMBER,
  TEST_PASSWORD_NO_UPPERCASE,
  TEST_PASSWORD_NO_LOWERCASE,
  TEST_PASSWORD_TOO_SHORT,
} from './testUtils'

const mockOnSubmit = vi.fn()

const renderComponent = (props = {}) => {
  const defaultProps = {
    onSubmit: mockOnSubmit,
    isLoading: false,
  }

  return render(<SignUpForm {...defaultProps} {...props} />)
}

let user

describe('SignUpForm', () => {
  beforeEach(() => {
    user = userEvent.setup()
    mockOnSubmit.mockClear()
  })

  describe('rendering', () => {
    it('renders form with all required inputs', () => {
      renderComponent()

      expect(screen.getByLabelText('Username')).toBeInTheDocument()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
    })

    it('renders submit button with correct text', () => {
      renderComponent()

      expect(screen.getByText('Sign Up')).toBeInTheDocument()
    })

    it('submit button is disabled initially', () => {
      renderComponent()

      const submitButton = screen.getByRole('button', { name: 'Create account' })
      expect(submitButton).toBeDisabled()
    })

    it('renders password requirements info icon', () => {
      renderComponent()

      expect(screen.getByRole('button', { name: 'Show password requirements' })).toBeInTheDocument()
    })
  })

  describe('name validation', () => {
    it('keeps submit disabled without name', async () => {
      renderComponent()

      const { emailInput, passwordInput } = getSignUpFormInputs()
      await user.type(emailInput, TEST_EMAIL)
      await user.type(passwordInput, TEST_VALID_PASSWORD)

      const submitButton = getSubmitButton('Create account')
      expect(submitButton).toBeDisabled()
    })

    it('accepts valid name', async () => {
      renderComponent()

      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_VALID_PASSWORD)

      await waitFor(() => {
        const submitButton = getSubmitButton('Create account')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('email validation', () => {
    it('keeps submit disabled with invalid email', async () => {
      renderComponent()

      await fillSignUpForm(user, TEST_NAME, 'invalid-email', TEST_VALID_PASSWORD)

      const submitButton = getSubmitButton('Create account')
      expect(submitButton).toBeDisabled()
    })

    it('enables submit with valid email format', async () => {
      renderComponent()

      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_VALID_PASSWORD)

      await waitFor(() => {
        const submitButton = getSubmitButton('Create account')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('password validation', () => {
    it('keeps submit disabled with too short password', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_PASSWORD_TOO_SHORT)
      expect(getSubmitButton('Create account')).toBeDisabled()
    })

    it('keeps submit disabled when password lacks number', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_PASSWORD_NO_NUMBER)
      expect(getSubmitButton('Create account')).toBeDisabled()
    })

    it('keeps submit disabled when password lacks uppercase', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_PASSWORD_NO_UPPERCASE)
      expect(getSubmitButton('Create account')).toBeDisabled()
    })

    it('keeps submit disabled when password lacks lowercase', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_PASSWORD_NO_LOWERCASE)
      expect(getSubmitButton('Create account')).toBeDisabled()
    })

    it('enables submit with valid password', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_VALID_PASSWORD)

      await waitFor(() => {
        expect(getSubmitButton('Create account')).not.toBeDisabled()
      })
    })
  })

  describe('password visibility toggle', () => {
    it('toggles password visibility when button is clicked', async () => {
      renderComponent()

      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement
      await testPasswordToggle(user, passwordInput)
    })
  })

  describe('form submission', () => {
    it('calls onSubmit with valid data', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_VALID_PASSWORD)

      await waitFor(() => {
        expect(getSubmitButton('Create account')).not.toBeDisabled()
      })

      await user.click(getSubmitButton('Create account'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
        expect(mockOnSubmit).toHaveBeenCalledWith(
          { username: TEST_NAME, email: TEST_EMAIL, password: TEST_VALID_PASSWORD },
          expect.any(Function)
        )
      })
    })

    it('does not submit form with invalid data', async () => {
      renderComponent()
      await fillSignUpForm(user, TEST_NAME, 'invalid-email', TEST_VALID_PASSWORD)

      const submitButton = getSubmitButton('Create account')
      expect(submitButton).toBeDisabled()

      await user.click(submitButton)
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('calls onSubmit once per submission', async () => {
      renderComponent()

      await fillSignUpForm(user, TEST_NAME, TEST_EMAIL, TEST_VALID_PASSWORD)

      await waitFor(() => {
        expect(getSubmitButton('Create account')).not.toBeDisabled()
      })

      await user.click(getSubmitButton('Create account'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('loading state', () => {
    it('disables all inputs when loading', () => {
      renderComponent({ isLoading: true })

      const { nameInput, emailInput, passwordInput } = getSignUpFormInputs()
      const submitButton = getSubmitButton('Create account')

      expectInputsDisabled(nameInput, emailInput, passwordInput, submitButton)
    })

    it('disables password toggle when loading', () => {
      renderComponent({ isLoading: true })
      expect(getPasswordToggle()).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('has correct aria-labels', () => {
      renderComponent()

      const { nameInput, emailInput, passwordInput } = getSignUpFormInputs()
      expectAriaLabel(nameInput, 'Username')
      expectAriaLabel(emailInput, 'Email address')
      expectAriaLabel(passwordInput, 'Password')
    })

    it('marks required fields with aria-required', () => {
      renderComponent()

      const { nameInput, emailInput, passwordInput } = getSignUpFormInputs()
      expectAriaRequired(nameInput, emailInput, passwordInput)
    })

    it('password field has aria-describedby for requirements', () => {
      renderComponent()

      const { passwordInput } = getSignUpFormInputs()
      expect(passwordInput).toHaveAttribute('aria-describedby', 'password-requirements')
    })
  })
})
