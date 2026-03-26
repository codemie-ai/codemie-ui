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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import FormActionButtons from '../FormActionButtons'

const defaultProps = {
  loginActionUrl: '/auth/login',
  cancelLabel: 'Cancel',
  submitLabel: 'Submit',
  cancelAriaLabel: 'Cancel action',
  submitAriaLabel: 'Submit form',
}

describe('FormActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('always renders the submit button', () => {
      render(<FormActionButtons {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Submit form' })).toBeInTheDocument()
    })

    it('renders submit button with correct label', () => {
      render(<FormActionButtons {...defaultProps} />)

      expect(screen.getByText('Submit')).toBeInTheDocument()
    })

    it('renders submit button as type submit', () => {
      render(<FormActionButtons {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: 'Submit form' })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('does not render cancel button when isAppInitiatedAction is false', () => {
      render(<FormActionButtons {...defaultProps} isAppInitiatedAction={false} />)

      expect(screen.queryByRole('button', { name: 'Cancel action' })).not.toBeInTheDocument()
    })

    it('does not render cancel button when isAppInitiatedAction is not provided', () => {
      render(<FormActionButtons {...defaultProps} />)

      expect(screen.queryByRole('button', { name: 'Cancel action' })).not.toBeInTheDocument()
    })

    it('renders cancel button when isAppInitiatedAction is true', () => {
      render(<FormActionButtons {...defaultProps} isAppInitiatedAction={true} />)

      expect(screen.getByRole('button', { name: 'Cancel action' })).toBeInTheDocument()
    })

    it('renders cancel button with correct label when isAppInitiatedAction is true', () => {
      render(<FormActionButtons {...defaultProps} isAppInitiatedAction={true} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('renders both buttons when isAppInitiatedAction is true', () => {
      render(<FormActionButtons {...defaultProps} isAppInitiatedAction={true} />)

      expect(screen.getByRole('button', { name: 'Submit form' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel action' })).toBeInTheDocument()
    })

    it('renders ReactNode submitLabel correctly', () => {
      render(
        <FormActionButtons
          {...defaultProps}
          submitLabel={<span data-testid="submit-label">Submit Now</span>}
        />
      )

      expect(screen.getByTestId('submit-label')).toBeInTheDocument()
    })

    it('renders ReactNode cancelLabel correctly when isAppInitiatedAction is true', () => {
      render(
        <FormActionButtons
          {...defaultProps}
          isAppInitiatedAction={true}
          cancelLabel={<span data-testid="cancel-label">Go Back</span>}
        />
      )

      expect(screen.getByTestId('cancel-label')).toBeInTheDocument()
    })
  })

  describe('cancel action (handleCancel)', () => {
    it('creates and submits a form with cancel-aia input when cancel is clicked', () => {
      // Render the component before mocking document.createElement to avoid stack overflow
      render(<FormActionButtons {...defaultProps} isAppInitiatedAction={true} />)

      const mockFormSubmit = vi.fn()
      const mockInputElement = {
        type: '',
        name: '',
        value: '',
      } as HTMLInputElement
      const mockFormElement = {
        method: '',
        action: '',
        appendChild: vi.fn(),
        submit: mockFormSubmit,
      } as unknown as HTMLFormElement

      const originalCreateElement = document.createElement.bind(document)
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'form') return mockFormElement
        if (tag === 'input') return mockInputElement
        return originalCreateElement(tag)
      })

      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockFormElement)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel action' }))

      expect(createElementSpy).toHaveBeenCalledWith('form')
      expect(createElementSpy).toHaveBeenCalledWith('input')
      expect(mockFormElement.method).toBe('post')
      expect(mockFormElement.action).toBe('/auth/login')
      expect(mockInputElement.type).toBe('hidden')
      expect(mockInputElement.name).toBe('cancel-aia')
      expect(mockInputElement.value).toBe('true')
      expect(mockFormElement.appendChild).toHaveBeenCalledWith(mockInputElement)
      expect(appendChildSpy).toHaveBeenCalledWith(mockFormElement)
      expect(mockFormSubmit).toHaveBeenCalledTimes(1)

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
    })

    it('uses the provided loginActionUrl for the form action', () => {
      const customUrl = '/custom/auth/cancel'

      render(
        <FormActionButtons
          {...defaultProps}
          loginActionUrl={customUrl}
          isAppInitiatedAction={true}
        />
      )

      const mockFormSubmit = vi.fn()
      const mockInputElement = {
        type: '',
        name: '',
        value: '',
      } as HTMLInputElement
      const mockFormElement = {
        method: '',
        action: '',
        appendChild: vi.fn(),
        submit: mockFormSubmit,
      } as unknown as HTMLFormElement

      const originalCreateElement = document.createElement.bind(document)
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'form') return mockFormElement
        if (tag === 'input') return mockInputElement
        return originalCreateElement(tag)
      })

      const appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation(() => mockFormElement)

      fireEvent.click(screen.getByRole('button', { name: 'Cancel action' }))

      expect(mockFormElement.action).toBe(customUrl)
      expect(mockFormSubmit).toHaveBeenCalledTimes(1)

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
    })
  })
})
