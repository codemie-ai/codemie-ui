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
import { describe, it, expect, vi } from 'vitest'

import ConfigSection from '../ConfigSection'

vi.mock('@/assets/icons/chevron-down.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
}))

describe('ConfigSection — toggle button accessibility', () => {
  const defaultProps = {
    title: 'Profile',
    children: () => <div>content</div>,
  }

  it('button has type="button"', () => {
    render(<ConfigSection {...defaultProps} />)
    expect(screen.getByRole('button', { name: /collapse profile/i })).toHaveAttribute(
      'type',
      'button'
    )
  })

  it('button has aria-expanded="true" when expanded (default)', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    expect(screen.getByRole('button', { name: /collapse profile/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })

  it('button has aria-expanded="false" when collapsed', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    expect(screen.getByRole('button', { name: /expand profile/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('button aria-label is "Collapse {title}" when expanded', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    expect(screen.getByRole('button', { name: 'Collapse Profile' })).toBeInTheDocument()
  })

  it('button aria-label is "Expand {title}" when collapsed', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    expect(screen.getByRole('button', { name: 'Expand Profile' })).toBeInTheDocument()
  })

  it('clicking the button toggles aria-expanded from true to false', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={true} />)
    fireEvent.click(screen.getByRole('button', { name: /collapse profile/i }))
    expect(screen.getByRole('button', { name: /expand profile/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('clicking the button toggles aria-expanded from false to true', () => {
    render(<ConfigSection {...defaultProps} defaultExpanded={false} />)
    fireEvent.click(screen.getByRole('button', { name: /expand profile/i }))
    expect(screen.getByRole('button', { name: /collapse profile/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })

  it('chevron icon has aria-hidden="true"', () => {
    render(<ConfigSection {...defaultProps} />)
    expect(screen.getByTestId('chevron-down-icon')).toHaveAttribute('aria-hidden', 'true')
  })
})
