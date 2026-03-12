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

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'

import ActionConfirmationModal from '../ActionConfirmationModal'

vi.mock('@/utils/toaster', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('ActionConfirmationModal', () => {
  const mockProps = {
    isOpen: true,
    header: 'Test Header',
    message: 'Test Message',
    confirmText: 'Confirm Action',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onSuccess: vi.fn(),
    successMessage: 'Action was successful.',
    errorMessage: 'Action failed.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockProps.onConfirm.mockResolvedValue(undefined)
    mockProps.onSuccess.mockResolvedValue(undefined)
  })

  afterEach(() => {
    mockConsoleError.mockClear()
  })

  it('renders nothing when isOpen is false', () => {
    render(<ActionConfirmationModal {...mockProps} isOpen={false} />)
    expect(screen.queryByRole('heading', { name: 'Test Header' })).not.toBeInTheDocument()
  })

  it('renders the header, message, and buttons when isOpen is true', () => {
    render(<ActionConfirmationModal {...mockProps} />)
    expect(screen.getByRole('heading', { name: 'Test Header' })).toBeInTheDocument()
    expect(screen.getByText('Test Message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Action' })).toBeInTheDocument()
  })

  it('calls onCancel when the cancel action is triggered', () => {
    render(<ActionConfirmationModal {...mockProps} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1)
  })

  it('handles the success flow: calls onConfirm, then onSuccess, then onCancel', async () => {
    render(<ActionConfirmationModal {...mockProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Action' }))

    await waitFor(() => {
      expect(mockProps.onConfirm).toHaveBeenCalledTimes(1)
      expect(mockProps.onSuccess).toHaveBeenCalledTimes(1)
      expect(mockProps.onCancel).toHaveBeenCalledTimes(1)
    })
  })

  it('handles the error flow: calls onConfirm and does NOT call onSuccess', async () => {
    const error = new Error('Something went wrong')
    mockProps.onConfirm.mockRejectedValue(error)

    render(<ActionConfirmationModal {...mockProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Action' }))

    await waitFor(() => {
      expect(mockProps.onConfirm).toHaveBeenCalledTimes(1)
    })

    expect(mockProps.onSuccess).not.toHaveBeenCalled()
    expect(mockProps.onCancel).toHaveBeenCalled()
  })
})
