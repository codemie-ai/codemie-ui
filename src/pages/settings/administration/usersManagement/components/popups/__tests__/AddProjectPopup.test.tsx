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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import AddProjectPopup from '../AddProjectPopup'

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit, onHide, submitDisabled }: any) =>
    visible ? (
      <div data-testid="popup">
        {children}
        <button onClick={onSubmit} disabled={submitDisabled}>
          Add
        </button>
        <button onClick={onHide}>Close</button>
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

vi.mock('@/components/ProjectSelector/ProjectSelector', () => ({
  default: ({ value, onChange }: any) => (
    <select
      data-testid="project-selector"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select</option>
      <option value="proj-a">proj-a</option>
    </select>
  ),
}))

describe('AddProjectPopup — set as default (EPMCDME-15112)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onAdd with setAsDefault=false when the switch is left off', () => {
    const onAdd = vi.fn()
    render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByTestId('project-selector'), { target: { value: 'proj-a' } })
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledWith('proj-a', false)
  })

  it('calls onAdd with setAsDefault=true when the switch is turned on', () => {
    const onAdd = vi.fn()
    render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByTestId('project-selector'), { target: { value: 'proj-a' } })
    fireEvent.click(screen.getByTestId('switch-add-project-set-default'))
    fireEvent.click(screen.getByText('Add'))

    expect(onAdd).toHaveBeenCalledWith('proj-a', true)
  })

  it('resets the switch after closing via the popup close action', () => {
    const onAdd = vi.fn()
    render(<AddProjectPopup isOpen onClose={vi.fn()} onAdd={onAdd} />)

    fireEvent.click(screen.getByTestId('switch-add-project-set-default'))
    expect(screen.getByTestId('switch-add-project-set-default')).toBeChecked()

    fireEvent.click(screen.getByText('Close'))

    expect(screen.getByTestId('switch-add-project-set-default')).not.toBeChecked()
  })
})
