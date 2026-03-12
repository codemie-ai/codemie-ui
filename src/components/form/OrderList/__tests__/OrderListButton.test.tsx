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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import OrderListButton from '../OrderListButton'

const mockOnClick = vi.fn()

const renderComponent = (props: Partial<React.ComponentProps<typeof OrderListButton>> = {}) => {
  const defaultProps = {
    'aria-label': 'Test button',
    onClick: mockOnClick,
  }

  return render(<OrderListButton {...defaultProps} {...props} />)
}

let user: ReturnType<typeof userEvent.setup>

describe('OrderListButton', () => {
  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders button with aria-label', () => {
    renderComponent({ 'aria-label': 'Edit item' })

    const button = screen.getByRole('button', { name: 'Edit item' })
    expect(button).toBeInTheDocument()
  })

  it('renders children content', () => {
    renderComponent({ children: <span>Edit</span> })

    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    renderComponent({ children: <span>Click me</span> })

    const button = screen.getByRole('button')
    await user.click(button)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('applies tertiary variant styling', () => {
    renderComponent()

    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-2', 'opacity-65', 'hover:opacity-100')
  })

  it('renders icon as children', () => {
    const Icon = () => <svg data-testid="icon" />
    renderComponent({ children: <Icon /> })

    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders without onClick handler', () => {
    renderComponent({ onClick: undefined })

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('renders multiple children', () => {
    renderComponent({
      children: (
        <>
          <span>Label</span>
          <svg data-testid="icon" />
        </>
      ),
    })

    expect(screen.getByText('Label')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('handles multiple clicks', async () => {
    renderComponent()

    const button = screen.getByRole('button')
    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(mockOnClick).toHaveBeenCalledTimes(3)
  })

  it('is keyboard accessible', async () => {
    renderComponent({ 'aria-label': 'Delete item' })

    const button = screen.getByRole('button', { name: 'Delete item' })
    button.focus()
    expect(button).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })
})
