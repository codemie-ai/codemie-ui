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
import { FC, SVGProps } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChatMessageAction from '../ChatMessageAction'

const MockIcon = () => <svg data-testid="mock-icon" />

const defaultProps = {
  label: 'Test Action',
  icon: MockIcon,
  onClick: vi.fn(),
}

describe('ChatMessageAction', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders correctly with label and icon', () => {
    render(<ChatMessageAction {...defaultProps} />)

    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-tooltip-content', 'Test Action')
    expect(button).toHaveAttribute('data-tooltip-id', 'react-tooltip')
  })

  it('calls onClick handler when button is clicked', async () => {
    render(<ChatMessageAction {...defaultProps} />)

    await user.click(screen.getByRole('button'))
    expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
  })

  it('renders with functional component as icon', () => {
    render(<ChatMessageAction {...defaultProps} />)

    const icon = screen.getByTestId('mock-icon')
    expect(icon).toBeInTheDocument()
  })

  it('renders with component as icon when provided', () => {
    const CustomIconComponent: FC<SVGProps<SVGElement>> = () => (
      <div data-testid="react-node-icon">Icon Content</div>
    )

    render(<ChatMessageAction label="Test Action" icon={CustomIconComponent} onClick={vi.fn()} />)

    expect(screen.getByTestId('react-node-icon')).toBeInTheDocument()
    expect(screen.getByText('Icon Content')).toBeInTheDocument()
  })

  it('renders with type="button" to prevent form submission', () => {
    render(<ChatMessageAction {...defaultProps} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
  })
})
