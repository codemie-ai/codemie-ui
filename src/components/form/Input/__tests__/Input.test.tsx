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
import userEvent from '@testing-library/user-event'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import PasswordToggleButton from '@/authentication/components/PasswordToggleButton'

import Input from '../Input'

const noop = vi.fn()

afterEach(() => {
  vi.clearAllMocks()
})

describe('Input', () => {
  describe('accessibility and announcements', () => {
    it('renders correctly with default props', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('generates a fallback ID when id prop is not provided', () => {
      render(<Input label="My Label" />)
      const input = screen.getByRole('textbox', { name: 'My Label' })
      const label = screen.getByText('My Label')

      expect(input.id).toBeTruthy()
      expect(label).toHaveAttribute('for', input.id)
    })

    it('uses provided id when specified', () => {
      render(<Input label="My Label" id="custom-input-id" />)
      const input = screen.getByRole('textbox', { name: 'My Label' })
      const label = screen.getByText('My Label')

      expect(input.id).toBe('custom-input-id')
      expect(label).toHaveAttribute('for', 'custom-input-id')
    })

    it('maintains a clean accessible name derived only from the label text', () => {
      render(
        <Input
          label="Clean Label"
          hint="This is a hint tooltip"
          labelContent={<a href="https://example.com/help">Need help?</a>}
          error="This is an error"
          required={true}
        />
      )

      // The accessible name should strictly be the label text. The asterisk is hidden via aria-hidden,
      // and 'Need help?', 'This is an error', and tooltip content are outside the label.
      const input = screen.getByRole('textbox', { name: /Clean Label/i })
      expect(input).toBeInTheDocument()

      // Check that aria-describedby links to the error message correctly
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-error'))
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('does not focus the input when clicking interactive labelContent', async () => {
      const onLabelContentClick = vi.fn()
      render(
        <Input
          label="Username"
          labelContent={<button onClick={onLabelContentClick}>Help</button>}
        />
      )

      const input = screen.getByRole('textbox', { name: 'Username' })
      const helpButton = screen.getByRole('button', { name: 'Help' })

      await userEvent.click(helpButton)

      expect(onLabelContentClick).toHaveBeenCalled()
      expect(input).not.toHaveFocus()
    })

    it('focuses the input when clicking the label text', async () => {
      render(<Input label="Clickable Label" />)

      const input = screen.getByRole('textbox', { name: 'Clickable Label' })
      const label = screen.getByText('Clickable Label')

      await userEvent.click(label)

      expect(input).toHaveFocus()
    })

    it('handles password visibility toggle without event bubbling issues', async () => {
      const user = userEvent.setup()
      const TestComponent = () => {
        const [showPassword, setShowPassword] = React.useState(false)
        return (
          <Input
            label="Password"
            sensitive
            showPassword={showPassword}
            rightIcon={
              <PasswordToggleButton
                showPassword={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
            }
          />
        )
      }

      render(<TestComponent />)

      // Initial state is password (hidden)
      const input = screen.getByLabelText('Password')
      expect(input).toHaveAttribute('type', 'password')

      const toggleButton = screen.getByRole('button', { name: /show password/i })

      await user.click(toggleButton)

      // State is now text (visible)
      expect(input).toHaveAttribute('type', 'text')
      // Ensure clicking the toggle didn't inappropriately pull focus to the input because of label wrapping
      expect(input).not.toHaveFocus()
    })
  })

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

    it('sets aria-required="true" when required prop is passed', () => {
      render(<Input id="email" name="email" value="" onChange={noop} required />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('preserves caller-supplied aria-required when required prop is omitted', () => {
      render(<Input id="email" name="email" value="" onChange={noop} aria-required="true" />)

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })
  })
})
