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

import Select from '../Select'

const options = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
]

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('Select', () => {
  describe('error association', () => {
    it('links the combobox to the error message via aria-describedby and role="alert"', () => {
      render(
        <Select
          id="project"
          name="project"
          value={null}
          options={options}
          onChange={noop}
          error="Project is required"
        />
      )

      const combobox = document.querySelector('input[aria-haspopup="listbox"]') as HTMLInputElement
      const errorNode = screen.getByRole('alert')

      expect(combobox).toBeTruthy()
      expect(errorNode).toHaveTextContent('Project is required')
      expect(errorNode).toHaveAttribute('id', combobox.getAttribute('aria-describedby'))
      expect(combobox).toHaveAttribute('aria-invalid', 'true')
    })

    it('does not render aria-describedby or an error node when there is no error', () => {
      render(<Select id="project" name="project" value={null} options={options} onChange={noop} />)

      const combobox = document.querySelector('input[aria-haspopup="listbox"]') as HTMLInputElement

      expect(combobox).toBeTruthy()
      expect(combobox).not.toHaveAttribute('aria-describedby')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('still associates the error when no id prop is passed (useId fallback)', () => {
      render(
        <Select name="project" value={null} options={options} onChange={noop} error="Required" />
      )

      const combobox = document.querySelector('input[aria-haspopup="listbox"]') as HTMLInputElement
      const errorNode = screen.getByRole('alert')
      const describedBy = combobox.getAttribute('aria-describedby')

      expect(describedBy).toBeTruthy()
      expect(errorNode).toHaveAttribute('id', describedBy)
    })

    it('re-mounts the alert node when the error message changes so screen readers re-announce', () => {
      const { rerender } = render(
        <Select
          id="project"
          name="project"
          value={null}
          options={options}
          onChange={noop}
          error="Required"
        />
      )

      const firstAlert = screen.getByRole('alert')

      rerender(
        <Select
          id="project"
          name="project"
          value={null}
          options={options}
          onChange={noop}
          error="Pick another project"
        />
      )

      const secondAlert = screen.getByRole('alert')
      expect(secondAlert).toHaveTextContent('Pick another project')
      expect(secondAlert).not.toBe(firstAlert)
    })
  })
})
