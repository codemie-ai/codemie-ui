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

import Input from '../Input'

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('Input', () => {
  describe('error association', () => {
    it('links the input to the error message via aria-describedby and role="alert"', () => {
      render(<Input id="name" name="name" value="" onChange={noop} error="Name is required" />)

      const input = screen.getByRole('textbox')
      const errorNode = screen.getByRole('alert')

      expect(errorNode).toHaveTextContent('Name is required')
      expect(errorNode).toHaveAttribute('id', input.getAttribute('aria-describedby'))
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAccessibleDescription('Name is required')
    })

    it('does not render aria-describedby or an error node when there is no error', () => {
      render(<Input id="name" name="name" value="" onChange={noop} />)

      const input = screen.getByRole('textbox')

      expect(input).not.toHaveAttribute('aria-describedby')
      expect(input).toHaveAttribute('aria-invalid', 'false')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('still associates the error when no id prop is passed (useId fallback)', () => {
      render(<Input name="name" value="" onChange={noop} error="Required" />)

      const input = screen.getByRole('textbox')
      const errorNode = screen.getByRole('alert')
      const describedBy = input.getAttribute('aria-describedby')

      expect(describedBy).toBeTruthy()
      expect(errorNode).toHaveAttribute('id', describedBy)
    })

    it('merges a caller-supplied aria-describedby with the computed error id and forces aria-invalid=true', () => {
      render(
        <Input
          id="name"
          name="name"
          value=""
          onChange={noop}
          error="Name is required"
          aria-describedby="caller-hint"
          aria-invalid={false}
        />
      )

      const input = screen.getByRole('textbox')
      const errorNode = screen.getByRole('alert')

      expect(input).toHaveAttribute(
        'aria-describedby',
        `caller-hint ${errorNode.getAttribute('id')}`
      )
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('preserves a caller-supplied aria-describedby when there is no error', () => {
      render(<Input id="age" name="age" value="" onChange={noop} aria-describedby="age-hint" />)

      const input = screen.getByRole('textbox')

      expect(input).toHaveAttribute('aria-describedby', 'age-hint')
    })

    it('re-mounts the alert node when the error message changes so screen readers re-announce', () => {
      const { rerender } = render(
        <Input id="name" name="name" value="" onChange={noop} error="Required" />
      )

      const firstAlert = screen.getByRole('alert')
      expect(firstAlert).toHaveTextContent('Required')

      rerender(
        <Input
          id="name"
          name="name"
          value=""
          onChange={noop}
          error="Must be at least 3 characters"
        />
      )

      const secondAlert = screen.getByRole('alert')
      expect(secondAlert).toHaveTextContent('Must be at least 3 characters')
      expect(secondAlert).not.toBe(firstAlert)
    })
  })
})
