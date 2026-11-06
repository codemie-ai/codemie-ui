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

import { fireEvent, render, screen, within } from '@testing-library/react'
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

  describe('custom item rendering', () => {
    it('uses itemTemplate to render each option row when provided', () => {
      const { container } = render(
        <Select
          id="project"
          name="project"
          value={null}
          options={options}
          onChange={noop}
          itemTemplate={(option) => <span data-testid="custom-row">{option.label}-custom</span>}
        />
      )

      fireEvent.click(container.querySelector('.p-dropdown')!)

      const rows = screen.getAllByTestId('custom-row')
      expect(rows.map((row) => row.textContent)).toEqual(['Option A-custom', 'Option B-custom'])
    })

    it('falls back to the default truncating row when itemTemplate is not provided', () => {
      const { container } = render(
        <Select id="project" name="project" value={null} options={options} onChange={noop} />
      )

      fireEvent.click(container.querySelector('.p-dropdown')!)

      expect(screen.getByText('Option A')).toBeInTheDocument()
      expect(screen.queryByTestId('custom-row')).not.toBeInTheDocument()
    })
  })

  describe('a11yCombobox', () => {
    const renderLabelled = (extra = {}) =>
      render(
        <>
          <span id="lbl">Show items</span>
          <Select
            id="sel"
            name="sel"
            value="a"
            options={options}
            onChange={noop}
            a11yCombobox
            ariaLabelledBy="lbl"
            listboxLabel="Items per page"
            {...extra}
          />
        </>
      )

    it('exposes a labelled combobox that stays readonly and has no aria-controls while closed', () => {
      renderLabelled()

      const combobox = screen.getByRole('combobox', { name: 'Show items' })
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
      expect(combobox).toHaveAttribute('readonly')
      expect(combobox).not.toHaveAttribute('aria-controls')
    })

    it('sets aria-expanded and aria-controls pointing at the named listbox when open', () => {
      renderLabelled()

      fireEvent.click(document.querySelector('#sel') as HTMLElement)

      const combobox = screen.getByRole('combobox', { name: 'Show items' })
      const listbox = screen.getByRole('listbox', { hidden: true, name: 'Items per page' })
      expect(combobox).toHaveAttribute('aria-expanded', 'true')
      expect(listbox.id).toBeTruthy()
      expect(combobox).toHaveAttribute('aria-controls', listbox.id)
    })

    it('hides the trigger from assistive technology', () => {
      renderLabelled()

      const trigger = document.querySelector('.p-dropdown-trigger') as HTMLElement
      expect(trigger).toHaveAttribute('aria-hidden', 'true')
    })

    it('fills a pre-existing live region only after a selection', () => {
      renderLabelled()

      const status = screen.getByRole('status')
      expect(status).toHaveClass('sr-only')
      expect(status).toHaveTextContent('')

      fireEvent.click(document.querySelector('#sel') as HTMLElement)
      const listbox = screen.getByRole('listbox', { hidden: true, name: 'Items per page' })
      const optionEls = within(listbox).getAllByRole('option', { hidden: true })
      fireEvent.click(optionEls[1])

      expect(screen.getByRole('status')).toBe(status)
      expect(status).toHaveTextContent('Option B selected')
    })

    it('prefers aria-labelledby over ariaLabel', () => {
      renderLabelled({ ariaLabel: 'Pick' })

      expect(screen.getByRole('combobox', { name: 'Show items' })).toBeInTheDocument()
    })

    it('keeps the default output when not opted in', () => {
      render(<Select id="sel" name="sel" value="a" options={options} onChange={noop} />)

      const input = document.querySelector('input[aria-haspopup="listbox"]') as HTMLInputElement
      expect(input).toHaveAttribute('readonly')
      expect(input).not.toHaveAttribute('aria-expanded')
      expect(screen.queryByRole('status')).toBeNull()
      expect(document.querySelector('.p-dropdown-trigger')).not.toHaveAttribute('aria-hidden')

      fireEvent.click(document.querySelector('#sel') as HTMLElement)

      expect(screen.getByRole('listbox', { hidden: true, name: 'Option List' })).toBeInTheDocument()
    })
  })
})
