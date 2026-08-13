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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChatHistoryControls from '../ChatHistoryControls'

vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-left-icon" {...props} />,
}))
vi.mock('@/assets/icons/chevron-right.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-right-icon" {...props} />,
}))

describe('ChatHistoryControls', () => {
  const defaultProps = {
    messageIndex: 1,
    totalMessages: 3,
    onChangeMessageIndex: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Previous version as a button with type="button"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /previous version/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('renders Next version as a button with type="button"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /next version/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('Previous version button is disabled at first index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={0} />)
    const btn = screen.getByRole('button', { name: /previous version/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveClass('disabled:opacity-25')
  })

  it('Next version button is disabled at last index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={2} />)
    const btn = screen.getByRole('button', { name: /next version/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveClass('disabled:opacity-25')
  })

  it('Previous version button is enabled when not at first index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} />)
    expect(screen.getByRole('button', { name: /previous version/i })).not.toBeDisabled()
  })

  it('Next version button is enabled when not at last index', () => {
    render(<ChatHistoryControls {...defaultProps} messageIndex={1} />)
    expect(screen.getByRole('button', { name: /next version/i })).not.toBeDisabled()
  })

  it('clicking Previous version calls onChangeMessageIndex with index - 1', () => {
    const onChangeMessageIndex = vi.fn()
    render(
      <ChatHistoryControls
        {...defaultProps}
        messageIndex={1}
        onChangeMessageIndex={onChangeMessageIndex}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /previous version/i }))
    expect(onChangeMessageIndex).toHaveBeenCalledWith(0)
  })

  it('clicking Next version calls onChangeMessageIndex with index + 1', () => {
    const onChangeMessageIndex = vi.fn()
    render(
      <ChatHistoryControls
        {...defaultProps}
        messageIndex={1}
        onChangeMessageIndex={onChangeMessageIndex}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /next version/i }))
    expect(onChangeMessageIndex).toHaveBeenCalledWith(2)
  })

  it('chevron icons have aria-hidden="true"', () => {
    render(<ChatHistoryControls {...defaultProps} />)
    expect(screen.getByTestId('chevron-left-icon')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('chevron-right-icon')).toHaveAttribute('aria-hidden', 'true')
  })

  it('returns null when totalMessages <= 1', () => {
    const { container } = render(
      <ChatHistoryControls {...defaultProps} totalMessages={1} messageIndex={0} />
    )
    expect(container.firstChild).toBeNull()
  })
})
