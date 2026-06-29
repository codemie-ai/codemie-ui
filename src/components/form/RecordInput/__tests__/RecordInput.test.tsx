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

import RecordInput from '../RecordInput'

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

describe('RecordInput', () => {
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
})
