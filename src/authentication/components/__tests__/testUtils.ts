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

import { screen } from '@testing-library/react'
import { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

/**
 * Test data constants
 * These are mock values used for testing purposes only
 */
export const TEST_EMAIL = 'test@example.com'
export const TEST_PASSWORD = 'password123'
export const TEST_NAME = 'John Doe'
export const TEST_VALID_PASSWORD = 'Password123' // Meets all validation requirements

// Invalid password test cases for validation testing
export const TEST_PASSWORD_NO_NUMBER = 'Password' // Missing number
export const TEST_PASSWORD_NO_UPPERCASE = 'password123' // Missing uppercase
export const TEST_PASSWORD_NO_LOWERCASE = 'PASSWORD123' // Missing lowercase
export const TEST_PASSWORD_TOO_SHORT = 'Pass1' // Less than 8 characters
export const TEST_PASSWORD_ANY = 'anypassword' // Any simple password

/**
 * Fill out email and password fields
 */
export async function fillEmailAndPassword(
  user: UserEvent,
  email: string,
  password: string
): Promise<void> {
  const emailInput = screen.getByLabelText('Email address')
  const passwordInput = screen.getByLabelText('Password')

  await user.type(emailInput, email)
  await user.type(passwordInput, password)
}

/**
 * Fill out all signup form fields
 */
export async function fillSignUpForm(
  user: UserEvent,
  name: string,
  email: string,
  password: string
): Promise<void> {
  const nameInput = screen.getByLabelText('Full name')
  const emailInput = screen.getByLabelText('Email address')
  const passwordInput = screen.getByLabelText('Password')

  await user.type(nameInput, name)
  await user.type(emailInput, email)
  await user.type(passwordInput, password)
}

/**
 * Get signup form inputs
 */
export function getSignUpFormInputs() {
  return {
    nameInput: screen.getByLabelText('Full name'),
    emailInput: screen.getByLabelText('Email address'),
    passwordInput: screen.getByLabelText('Password'),
  }
}

/**
 * Get submit button by aria-label
 */
export function getSubmitButton(label: string) {
  return screen.getByRole('button', { name: label })
}

/**
 * Get common form inputs
 */
export function getFormInputs() {
  return {
    emailInput: screen.getByLabelText('Email address'),
    passwordInput: screen.getByLabelText('Password'),
  }
}

/**
 * Get password toggle button
 */
export function getPasswordToggle() {
  return screen.getByRole('button', { name: 'Show password' })
}

/**
 * Test password visibility toggle
 */
export async function testPasswordToggle(
  user: UserEvent,
  passwordInput: HTMLInputElement
): Promise<void> {
  expect(passwordInput.type).toBe('password')

  const toggleButton = getPasswordToggle()
  await user.click(toggleButton)

  expect(passwordInput.type).toBe('text')

  await user.click(toggleButton)
  expect(passwordInput.type).toBe('password')
}

/**
 * Test loading state for inputs
 */
export function expectInputsDisabled(...inputs: HTMLElement[]): void {
  inputs.forEach((input) => {
    expect(input).toBeDisabled()
  })
}

/**
 * Test aria-label attributes
 */
export function expectAriaLabel(element: HTMLElement, label: string): void {
  expect(element).toHaveAttribute('aria-label', label)
}

/**
 * Test aria-required attributes
 */
export function expectAriaRequired(...elements: HTMLElement[]): void {
  elements.forEach((element) => {
    expect(element).toHaveAttribute('aria-required', 'true')
  })
}
