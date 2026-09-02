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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import CreateUserPopup from '../CreateUserPopup'

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: { createUser: vi.fn() },
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit, submitDisabled }: any) =>
    visible ? (
      <div data-testid="popup">
        {children}
        <button onClick={onSubmit} disabled={submitDisabled}>
          Submit
        </button>
      </div>
    ) : null,
}))
vi.mock('@/components/form/Switch', () => ({
  default: ({ id, label, value, onChange, disabled }: any) => (
    <label>
      {label}
      <input
        type="checkbox"
        checked={!!value}
        disabled={!!disabled}
        onChange={(e) => onChange({ target: { checked: e.target.checked } })}
        data-testid={`switch-${id}`}
      />
    </label>
  ),
}))

const TEST_PASSWORD = 'secret123'

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
  fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: TEST_PASSWORD } })
}

describe('CreateUserPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('turning on Maintainer forces Admin on and clears Auditor', () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByTestId('switch-create-user-auditor'))
    fireEvent.click(screen.getByTestId('switch-create-user-maintainer'))
    expect(screen.getByTestId('switch-create-user-admin')).toBeChecked()
    expect(screen.getByTestId('switch-create-user-auditor')).not.toBeChecked()
  })

  it('turning on Admin clears Auditor', () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByTestId('switch-create-user-auditor'))
    fireEvent.click(screen.getByTestId('switch-create-user-admin'))
    expect(screen.getByTestId('switch-create-user-auditor')).not.toBeChecked()
  })

  it('disables Auditor while Admin is on, and disables Admin while Maintainer is on', () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    fireEvent.click(screen.getByTestId('switch-create-user-admin'))
    expect(screen.getByTestId('switch-create-user-auditor')).toBeDisabled()

    fireEvent.click(screen.getByTestId('switch-create-user-maintainer'))
    expect(screen.getByTestId('switch-create-user-admin')).toBeDisabled()
    expect(screen.getByTestId('switch-create-user-auditor')).toBeDisabled()
  })

  it('resets form values and role switches when the popup closes and reopens', () => {
    const { rerender } = render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fillRequiredFields()
    fireEvent.click(screen.getByTestId('switch-create-user-admin'))
    expect(screen.getByTestId('switch-create-user-admin')).toBeChecked()

    rerender(<CreateUserPopup isOpen={false} onClose={vi.fn()} onCreated={vi.fn()} />)
    rerender(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    expect(screen.getByLabelText(/email/i)).toHaveValue('')
    expect(screen.getByLabelText(/username/i)).toHaveValue('')
    expect(screen.getByLabelText(/password/i)).toHaveValue('')
    expect(screen.getByTestId('switch-create-user-admin')).not.toBeChecked()
  })

  it('disables the Create button while submission is in flight', async () => {
    let resolveCreate: (value: unknown) => void = () => {}
    mockUserStore.createUser.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fillRequiredFields()
    fireEvent.click(screen.getByText('Submit'))

    await waitFor(() => expect(screen.getByText('Submit')).toBeDisabled())

    resolveCreate({ id: '1' })
    await waitFor(() => expect(screen.getByText('Submit')).not.toBeDisabled())
  })

  it('does not submit when required fields are missing', async () => {
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={vi.fn()} />)
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => expect(mockUserStore.createUser).not.toHaveBeenCalled())
  })

  it('calls createUser and onCreated on successful submit, without calling onClose', async () => {
    mockUserStore.createUser.mockResolvedValue({ id: '1' })
    const onCreated = vi.fn()
    const onClose = vi.fn()
    render(<CreateUserPopup isOpen onClose={onClose} onCreated={onCreated} />)
    fillRequiredFields()
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() =>
      expect(mockUserStore.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', username: 'newuser', password: TEST_PASSWORD })
      )
    )
    await waitFor(() => expect(onCreated).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps modal open and does not call onCreated when createUser rejects', async () => {
    mockUserStore.createUser.mockRejectedValue(new Error('400'))
    const onCreated = vi.fn()
    render(<CreateUserPopup isOpen onClose={vi.fn()} onCreated={onCreated} />)
    fillRequiredFields()
    fireEvent.click(screen.getByText('Submit'))
    await waitFor(() => expect(mockUserStore.createUser).toHaveBeenCalled())
    expect(onCreated).not.toHaveBeenCalled()
    expect(screen.getByTestId('popup')).toBeInTheDocument()
  })
})
