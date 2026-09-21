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
import { afterEach, describe, expect, it, vi } from 'vitest'

import MultiSelect from '../MultiSelect'

const options = [
  { label: 'Cat A', value: 'a' },
  { label: 'Cat B', value: 'b' },
]

afterEach(() => {
  vi.clearAllMocks()
})

const focusableTrigger = () => document.querySelector<HTMLElement>('input[role="combobox"]')

describe('MultiSelect a11y error announcement', () => {
  it('links the trigger to the error message via aria-describedby and role="alert"', () => {
    render(
      <MultiSelect
        id="categories"
        value={[]}
        options={options}
        onChange={vi.fn()}
        onFilter={vi.fn()}
        error="Select at least one category"
      />
    )

    const trigger = focusableTrigger()
    const errorNode = screen.getByRole('alert')

    expect(trigger).toBeTruthy()
    expect(errorNode).toHaveTextContent('Select at least one category')
    expect(errorNode).toHaveAttribute('id', trigger!.getAttribute('aria-describedby'))
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not render aria-describedby or an error node when there is no error', () => {
    render(
      <MultiSelect
        id="categories"
        value={[]}
        options={options}
        onChange={vi.fn()}
        onFilter={vi.fn()}
      />
    )

    const trigger = focusableTrigger()

    expect(trigger).toBeTruthy()
    expect(trigger).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('still associates the error when no id prop is passed (useId fallback)', () => {
    render(
      <MultiSelect
        value={[]}
        options={options}
        onChange={vi.fn()}
        onFilter={vi.fn()}
        error="Required"
      />
    )

    const trigger = focusableTrigger()
    const errorNode = screen.getByRole('alert')
    const describedBy = trigger!.getAttribute('aria-describedby')

    expect(describedBy).toBeTruthy()
    expect(errorNode).toHaveAttribute('id', describedBy)
  })

  it('re-mounts the alert node when the error message changes so screen readers re-announce', () => {
    const { rerender } = render(
      <MultiSelect
        id="categories"
        value={[]}
        options={options}
        onChange={vi.fn()}
        onFilter={vi.fn()}
        error="Required"
      />
    )

    const firstAlert = screen.getByRole('alert')

    rerender(
      <MultiSelect
        id="categories"
        value={[]}
        options={options}
        onChange={vi.fn()}
        onFilter={vi.fn()}
        error="Select at least one category"
      />
    )

    const secondAlert = screen.getByRole('alert')
    expect(secondAlert).toHaveTextContent('Select at least one category')
    expect(secondAlert).not.toBe(firstAlert)
  })
})
