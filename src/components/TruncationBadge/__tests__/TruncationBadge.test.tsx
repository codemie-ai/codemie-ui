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
import { describe, it, expect, vi } from 'vitest'

import { TRUNCATION_TOOLTIP_PREFIX } from '@/constants/workflows'

import TruncationBadge from '../TruncationBadge'

vi.mock('@/assets/icons/status-warning.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="warning-icon" className={className} />
  ),
}))

describe('TruncationBadge', () => {
  it('renders nothing when truncated is false', () => {
    const { container } = render(<TruncationBadge truncated={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when truncated is undefined', () => {
    const { container } = render(<TruncationBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the warning icon when truncated is true', () => {
    render(<TruncationBadge truncated={true} />)
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
  })

  it('shows the generic tooltip', () => {
    render(<TruncationBadge truncated={true} />)
    const badge = screen.getByTestId('warning-icon').closest('[data-tooltip-content]')
    expect(badge).toHaveAttribute('data-tooltip-content', TRUNCATION_TOOLTIP_PREFIX)
  })

  it('uses the react-tooltip id', () => {
    render(<TruncationBadge truncated={true} />)
    const badge = screen.getByTestId('warning-icon').closest('[data-tooltip-id]')
    expect(badge).toHaveAttribute('data-tooltip-id', 'react-tooltip')
  })

  it('applies a custom className to the icon alongside the default styling', () => {
    render(<TruncationBadge truncated={true} className="size-4" />)
    const icon = screen.getByTestId('warning-icon')
    expect(icon).toHaveClass('size-4')
  })
})
