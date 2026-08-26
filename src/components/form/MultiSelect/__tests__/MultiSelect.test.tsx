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
import { describe, expect, it, vi } from 'vitest'

import MultiSelect from '../MultiSelect'

describe('MultiSelect', () => {
  it('keeps the hidden combobox input controlled when value changes from empty to selected', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const onChange = vi.fn()
    const options = [{ label: 'Project A', value: 'Project A' }]

    const { rerender } = render(
      <MultiSelect value="" options={options} onChange={onChange} onFilter={vi.fn()} singleValue />
    )

    expect(screen.getByRole('combobox')).toHaveValue('')

    rerender(
      <MultiSelect
        value="Project A"
        options={options}
        onChange={onChange}
        onFilter={vi.fn()}
        singleValue
      />
    )

    expect(screen.getByRole('combobox')).toHaveValue('Project A')
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining('A component is changing an uncontrolled input to be controlled')
    )

    consoleError.mockRestore()
  })

  it('renders a visible focus indicator class on the root element when focused', () => {
    const options = [{ label: 'Option 1', value: 'opt1' }]
    const { container } = render(
      <MultiSelect value="" options={options} onChange={vi.fn()} singleValue />
    )

    const combobox = screen.getByRole('combobox')
    const rootEl = container.querySelector('.p-multiselect')

    expect(rootEl).toHaveClass('focus-within:border-border-secondary')
    combobox.focus()
    expect(document.activeElement).toBe(combobox)
  })

  it('applies error and disabled classes correctly on the root element', () => {
    const options = [{ label: 'Option 1', value: 'opt1' }]
    const { container, rerender } = render(
      <MultiSelect value="" options={options} onChange={vi.fn()} error="Required" singleValue />
    )

    const rootEl = container.querySelector('.p-multiselect')
    expect(rootEl).toHaveClass('!border-failed-secondary')

    rerender(
      <MultiSelect value="" options={options} onChange={vi.fn()} disabled singleValue />
    )
    expect(rootEl).toHaveClass('opacity-60')
    expect(rootEl).toHaveClass('pointer-events-none')
    expect(rootEl).toHaveClass('cursor-default')

    rerender(
      <MultiSelect
        value=""
        options={options}
        onChange={vi.fn()}
        error="Required"
        disabled
        singleValue
      />
    )
    expect(rootEl).toHaveClass('!border-failed-secondary')
    expect(rootEl).toHaveClass('opacity-60')
    expect(rootEl).toHaveClass('focus-within:border-border-secondary')
  })
})
