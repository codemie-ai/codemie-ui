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

import LogoutSessionsCheckbox from '../LogoutSessionsCheckbox'

describe('LogoutSessionsCheckbox', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the checkbox input', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('renders the label text', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      expect(screen.getByText('Stay logged in')).toBeInTheDocument()
    })

    it('renders with checked state when checked prop is true', () => {
      render(
        <LogoutSessionsCheckbox checked={true} onChange={mockOnChange} label="Stay logged in" />
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('renders with unchecked state when checked prop is false', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })

    it('renders label as a ReactNode', () => {
      render(
        <LogoutSessionsCheckbox
          checked={false}
          onChange={mockOnChange}
          label={<span data-testid="custom-label">Custom Label</span>}
        />
      )

      expect(screen.getByTestId('custom-label')).toBeInTheDocument()
    })

    it('associates label with checkbox via htmlFor and id', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('id', 'logout-sessions')

      const label = screen.getByText('Stay logged in').closest('label')
      expect(label).toHaveAttribute('for', 'logout-sessions')
    })
  })

  describe('interactions', () => {
    it('calls onChange with true when checkbox is checked', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith(true)
    })

    it('calls onChange with false when checkbox is unchecked', () => {
      render(
        <LogoutSessionsCheckbox checked={true} onChange={mockOnChange} label="Stay logged in" />
      )

      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnChange).toHaveBeenCalledTimes(1)
      expect(mockOnChange).toHaveBeenCalledWith(false)
    })

    it('calls onChange exactly once per click', () => {
      render(
        <LogoutSessionsCheckbox checked={false} onChange={mockOnChange} label="Stay logged in" />
      )

      fireEvent.click(screen.getByRole('checkbox'))
      fireEvent.click(screen.getByRole('checkbox'))

      expect(mockOnChange).toHaveBeenCalledTimes(2)
    })
  })
})
