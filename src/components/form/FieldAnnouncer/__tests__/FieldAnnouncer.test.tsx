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
import { describe, expect, it } from 'vitest'

import FieldAnnouncer, { FieldAnnouncerProps } from '../FieldAnnouncer'

const renderField = (props: Omit<FieldAnnouncerProps, 'children'>) =>
  render(
    <FieldAnnouncer {...props}>
      {({ ariaInvalid, ariaDescribedBy }) => (
        <input aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy} />
      )}
    </FieldAnnouncer>
  )

describe('FieldAnnouncer', () => {
  it('links the field to a role="alert" error node when there is an error', () => {
    renderField({ id: 'name', error: 'Name is required' })

    const input = screen.getByRole('textbox')
    const errorNode = screen.getByRole('alert')

    expect(errorNode).toHaveTextContent('Name is required')
    expect(errorNode).toHaveAttribute('id', 'name-error')
    expect(input).toHaveAttribute('aria-describedby', 'name-error')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Name is required')
  })

  it('renders no error node and no aria-describedby when there is no error', () => {
    renderField({ id: 'name' })

    const input = screen.getByRole('textbox')

    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('derives the error id from useId when no id is passed', () => {
    renderField({ error: 'Required' })

    const input = screen.getByRole('textbox')
    const describedBy = input.getAttribute('aria-describedby')

    expect(describedBy).toBeTruthy()
    expect(screen.getByRole('alert')).toHaveAttribute('id', describedBy)
  })

  it('appends the error id to a caller-supplied describedBy', () => {
    renderField({ id: 'name', error: 'Required', describedBy: 'name-hint' })

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'name-hint name-error')
  })

  it('keeps a caller-supplied describedBy when there is no error', () => {
    renderField({ id: 'name', describedBy: 'name-hint' })

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'name-hint')
  })

  it('re-mounts the alert node when the error text changes so screen readers re-announce', () => {
    const { rerender } = renderField({ id: 'name', error: 'Required' })
    const firstAlert = screen.getByRole('alert')

    rerender(
      <FieldAnnouncer id="name" error="Must be at least 3 characters">
        {({ ariaInvalid, ariaDescribedBy }) => (
          <input aria-invalid={ariaInvalid} aria-describedby={ariaDescribedBy} />
        )}
      </FieldAnnouncer>
    )

    const secondAlert = screen.getByRole('alert')
    expect(secondAlert).toHaveTextContent('Must be at least 3 characters')
    expect(secondAlert).not.toBe(firstAlert)
  })

  it('applies errorClassName to the error node', () => {
    renderField({ id: 'name', error: 'Required', errorClassName: 'text-sm custom-error' })

    expect(screen.getByRole('alert')).toHaveClass('text-sm', 'custom-error')
  })
})
