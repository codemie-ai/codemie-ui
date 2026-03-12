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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ConfirmationModal, { ConfirmationModalProps } from '../ConfirmationModal'

vi.mock('@/assets/icons/new/delete.svg?react', () => ({
  default: () => <span data-testid="delete-icon" />,
}))

const mockOnCancel = vi.fn()
const mockOnConfirm = vi.fn()

const renderConfirmationModal = (props: Partial<ConfirmationModalProps> = {}) => {
  const defaultProps = {
    header: 'Delete Confirmation',
    message: 'Are you sure you want to delete this item?',
    visible: true,
    onCancel: mockOnCancel,
    onConfirm: mockOnConfirm,
  }

  return render(
    <ConfirmationModal {...defaultProps} {...props}>
      {props.children}
    </ConfirmationModal>
  )
}

describe('ConfirmationModal', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders correctly with default props when visible', () => {
    renderConfirmationModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Delete Confirmation')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
  })

  it('does not render when "visible" is false', () => {
    renderConfirmationModal({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onCancel when the Cancel button is clicked', async () => {
    renderConfirmationModal()

    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when the confirmation button is clicked', async () => {
    renderConfirmationModal()

    await user.click(screen.getByRole('button', { name: /Delete/i }))

    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    expect(mockOnCancel).not.toHaveBeenCalled()
  })

  it('renders a custom confirm button text when provided', () => {
    renderConfirmationModal({ confirmText: 'Yes, Remove It' })

    expect(screen.getByRole('button', { name: /Yes, Remove It/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument()
  })

  it('renders children content when provided', () => {
    renderConfirmationModal({
      children: <div data-testid="custom-child">Additional warning!</div>,
    })

    expect(screen.getByTestId('custom-child')).toBeInTheDocument()
    expect(screen.getByText('Additional warning!')).toBeInTheDocument()
  })
})
