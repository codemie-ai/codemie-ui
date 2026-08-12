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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import RecordInput, { type RecordItem } from '../RecordInput'

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <svg data-testid="delete-icon" />,
}))

vi.mock('@/components/Button', () => ({
  default: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/TooltipButton', () => ({
  default: ({ content }: any) => <span title={content}>?</span>,
}))

vi.mock('@/components/form/Input', () => ({
  default: ({ value, onChange, placeholder, disabled, id, name }: any) => (
    <input
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  ),
}))

const noop = vi.fn()

const ControlledRecordInput = ({ initial }: { initial: RecordItem[] }) => {
  const [items, setItems] = useState<RecordItem[]>(initial)

  return (
    <RecordInput name="test" value={items} onChange={setItems} addText="Add Environment Variable" />
  )
}

const getDeleteButtons = () =>
  screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('[data-testid="delete-icon"]'))

const getAnnouncement = () => screen.getByRole('status').textContent

// The live region is written one animation frame after the change, so every announcement
// assertion has to wait for it.
const expectAnnouncement = (expected: string) =>
  waitFor(() => expect(getAnnouncement()).toBe(expected))

describe('RecordInput', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('badge rendering', () => {
    it('does not render a badge when badge is not provided', () => {
      render(<RecordInput name="test" value={[{ key: 'foo', value: 'bar' }]} onChange={noop} />)

      expect(screen.queryByText('required')).not.toBeInTheDocument()
      expect(screen.queryByText('optional')).not.toBeInTheDocument()
    })

    it('renders the badge text when badge is provided', () => {
      render(
        <RecordInput
          name="test"
          value={[{ key: 'foo', value: 'bar', badge: 'optional' }]}
          onChange={noop}
        />
      )

      expect(screen.getByText('optional')).toBeInTheDocument()
    })

    it('renders required asterisk indicator in error color', () => {
      render(
        <RecordInput
          name="test"
          value={[{ key: 'foo', value: 'bar', badge: 'required' }]}
          onChange={noop}
        />
      )

      const asterisk = screen.getByText('*')
      expect(asterisk).toHaveClass('text-text-error')
    })

    it('applies quaternary color class for non-required badge', () => {
      render(
        <RecordInput
          name="test"
          value={[{ key: 'foo', value: 'bar', badge: 'optional' }]}
          onChange={noop}
        />
      )

      const badge = screen.getByText('optional')
      expect(badge).toHaveClass('text-text-quaternary')
    })

    it('renders badges for multiple items independently', () => {
      render(
        <RecordInput
          name="test"
          value={[
            { key: 'a', value: '1', badge: 'required' },
            { key: 'b', value: '2', badge: 'optional' },
            { key: 'c', value: '3' },
          ]}
          onChange={noop}
        />
      )

      expect(screen.getByText('*')).toHaveClass('text-text-error')
      expect(screen.getByText('optional')).toHaveClass('text-text-quaternary')
    })
  })

  describe('label rendering', () => {
    it('renders the label when provided', () => {
      render(
        <RecordInput
          name="test"
          label="My Label"
          value={[{ key: '', value: '' }]}
          onChange={noop}
        />
      )

      expect(screen.getByText('My Label')).toBeInTheDocument()
    })

    it('does not render a label element when label is not provided', () => {
      render(<RecordInput name="test" value={[{ key: '', value: '' }]} onChange={noop} />)

      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })
  })

  describe('error rendering', () => {
    it('displays an error message when error prop is set', () => {
      render(
        <RecordInput
          name="test"
          value={[{ key: '', value: '' }]}
          onChange={noop}
          error="Something went wrong"
        />
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('does not display an error when error prop is not set', () => {
      render(<RecordInput name="test" value={[{ key: '', value: '' }]} onChange={noop} />)

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('row announcements', () => {
    it('renders an empty status region on mount so the auto-seeded row is not announced', () => {
      render(<ControlledRecordInput initial={[]} />)

      expect(getAnnouncement()).toBe('')
    })

    it('announces the new row count when a row is added', async () => {
      const user = userEvent.setup()
      render(<ControlledRecordInput initial={[{ key: 'FOO', value: 'bar' }]} />)

      await user.click(screen.getByRole('button', { name: 'Add Environment Variable' }))

      await expectAnnouncement('Row added. 2 rows total.')
    })

    it('announces the remaining row count when a row is removed', async () => {
      const user = userEvent.setup()
      render(
        <ControlledRecordInput
          initial={[
            { key: 'FOO', value: 'bar' },
            { key: 'BAZ', value: 'qux' },
          ]}
        />
      )

      await user.click(getDeleteButtons()[0])

      await expectAnnouncement('Row removed. 1 row total.')
    })

    it('announces one remaining row when the last row is removed and re-seeded', async () => {
      const user = userEvent.setup()
      render(<ControlledRecordInput initial={[{ key: 'FOO', value: 'bar' }]} />)

      await user.click(getDeleteButtons()[0])

      await expectAnnouncement('Row removed. 1 row total.')
    })

    it('repeats an identical message so the second removal is announced too', async () => {
      const user = userEvent.setup()
      render(
        <ControlledRecordInput
          initial={[
            { key: 'FOO', value: 'bar' },
            { key: 'BAZ', value: 'qux' },
          ]}
        />
      )

      await user.click(getDeleteButtons()[0])
      await expectAnnouncement('Row removed. 1 row total.')

      // Removing the only remaining row re-seeds an empty one, so the message is identical. The
      // queue empties the region first and replays it a gap later — see useAnnouncementQueue.
      await user.click(getDeleteButtons()[0])

      await waitFor(() => expect(getAnnouncement()).toBe(''))
      await waitFor(() => expect(getAnnouncement()).toBe('Row removed. 1 row total.'), {
        timeout: 3000,
      })
    })
  })
})
