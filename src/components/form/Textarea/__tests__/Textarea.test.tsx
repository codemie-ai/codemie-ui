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

import Textarea from '../Textarea'

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('Textarea', () => {
  describe('error association', () => {
    it('links the textarea to the error message via aria-describedby', () => {
      render(
        <Textarea
          id="description"
          name="description"
          value=""
          onChange={noop}
          error="This field is required"
        />
      )

      const textarea = screen.getByRole('textbox')
      const errorNode = screen.getByText('This field is required')

      expect(errorNode).toHaveAttribute('id', textarea.getAttribute('aria-describedby'))
      expect(textarea).toHaveAttribute('aria-invalid', 'true')
      expect(textarea).toHaveAccessibleDescription('This field is required')
    })

    it('does not render aria-describedby or an error node when there is no error', () => {
      render(<Textarea id="description" name="description" value="" onChange={noop} />)

      const textarea = screen.getByRole('textbox')

      expect(textarea).not.toHaveAttribute('aria-describedby')
      expect(textarea).toHaveAttribute('aria-invalid', 'false')
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument()
    })

    it('still associates the error when no id prop is passed (useId fallback)', () => {
      render(<Textarea name="description" value="" onChange={noop} error="Required" />)

      const textarea = screen.getByRole('textbox')
      const errorNode = screen.getByText('Required')
      const describedBy = textarea.getAttribute('aria-describedby')

      expect(describedBy).toBeTruthy()
      expect(errorNode).toHaveAttribute('id', describedBy)
    })

    it('merges a caller-supplied aria-describedby with the computed error id and forces aria-invalid=true', () => {
      render(
        <Textarea
          id="description"
          name="description"
          value=""
          onChange={noop}
          error="This field is required"
          aria-describedby="caller-hint"
          aria-invalid={false}
        />
      )

      const textarea = screen.getByRole('textbox')
      const errorNode = screen.getByRole('alert')

      expect(textarea).toHaveAttribute(
        'aria-describedby',
        `caller-hint ${errorNode.getAttribute('id')}`
      )
      expect(textarea).toHaveAttribute('aria-invalid', 'true')
    })

    it('preserves a caller-supplied aria-describedby when there is no error', () => {
      render(
        <Textarea
          id="description"
          name="description"
          value=""
          onChange={noop}
          aria-describedby="description-hint"
        />
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'description-hint')
    })

    it('re-mounts the alert node when the error message changes so screen readers re-announce', () => {
      const { rerender } = render(
        <Textarea id="description" name="description" value="" onChange={noop} error="Required" />
      )

      const firstAlert = screen.getByRole('alert')

      rerender(
        <Textarea
          id="description"
          name="description"
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

  describe('warning', () => {
    it('renders the warning text in amber and an amber border', () => {
      render(<Textarea id="body" name="body" value="" onChange={noop} warning="Looks suspicious" />)

      const warningNode = screen.getByText('Looks suspicious')
      const textarea = screen.getByRole('textbox')
      expect(warningNode).toHaveClass('text-aborted-primary')
      expect(textarea).toHaveAttribute('aria-describedby', warningNode.id)
      expect(textarea).not.toHaveAttribute('aria-invalid', 'true')
      expect(textarea).toHaveClass('border-aborted-secondary')
    })

    it('renders only the error when both error and warning are set', () => {
      render(<Textarea id="body" name="body" value="" onChange={noop} error="Bad" warning="Hmm" />)

      const textarea = screen.getByRole('textbox')
      expect(screen.getByRole('alert')).toHaveTextContent('Bad')
      expect(screen.queryByText('Hmm')).not.toBeInTheDocument()
      expect(textarea).toHaveClass('border-border-error')
      expect(textarea).not.toHaveClass('border-aborted-secondary')
    })
  })
})
