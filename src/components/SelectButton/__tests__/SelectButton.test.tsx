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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import SelectButton from '../SelectButton'

const options = [
  { label: 'User', value: 'user' },
  { label: 'Project', value: 'project', disabled: true, tooltip: 'Project admins only.' },
]

describe('SelectButton disabled options', () => {
  it('does not call onChange for a disabled option and exposes its tooltip', async () => {
    const onChange = vi.fn()
    render(<SelectButton value="user" options={options} onChange={onChange} />)

    const project = screen.getByText('Project')
    expect(project.closest('[data-tooltip-id="react-tooltip"]')).toHaveAttribute(
      'data-tooltip-content',
      'Project admins only.'
    )
    expect(screen.getByRole('button', { name: 'Project' })).toHaveAttribute('aria-disabled', 'true')

    await userEvent.click(project, { pointerEventsCheck: 0 })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables every option when the disabled prop is set', async () => {
    const onChange = vi.fn()
    render(<SelectButton value="user" options={['User', 'Project']} onChange={onChange} disabled />)

    expect(screen.getByRole('button', { name: 'Project' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(screen.getByText('Project'), { pointerEventsCheck: 0 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
