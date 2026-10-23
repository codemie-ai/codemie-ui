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
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import DetailsBadge from '../DetailsBadge'

describe('DetailsBadge', () => {
  it('renders the icon above the value inside a Link when href is passed', () => {
    render(
      <MemoryRouter>
        <DetailsBadge
          icon={<span data-testid="default-project-marker">Default</span>}
          value="project-a (admin)"
          href="/settings/administration/projects/project-a"
        />
      </MemoryRouter>
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/settings/administration/projects/project-a')
    const marker = screen.getByTestId('default-project-marker')
    expect(link).toContainElement(marker)
    expect(marker.parentElement?.className).toMatch(/whitespace-nowrap/)
    expect(screen.getByText('project-a (admin)')).toBeInTheDocument()
  })

  it('keeps the icon/label on its own non-wrapping line, separate from the wrapping value', () => {
    render(
      <DetailsBadge
        icon={<span data-testid="marker">Default</span>}
        value="a-very-long-project-name (admin)"
        className="whitespace-normal break-all"
      />
    )
    const marker = screen.getByTestId('marker')
    const labelLine = marker.parentElement
    expect(labelLine?.className).toMatch(/whitespace-nowrap/)
    expect(labelLine?.textContent).toBe('Default')
    expect(screen.getByText('a-very-long-project-name (admin)')).toBeInTheDocument()
  })

  it('falls back to the original single-line layout when no icon is passed', () => {
    render(<DetailsBadge value="Overridden" className="text-xs" />)
    expect(screen.queryByText('Default')).toBeNull()
    expect(screen.getByText('Overridden')).toBeInTheDocument()
  })

  it('keeps the value line able to shrink in a flex row so break-words can actually wrap a long token', () => {
    // overflow-wrap:break-word is excluded from a flex item's min-content size by spec,
    // so without min-w-0 the value line keeps its unbroken intrinsic width and overflows
    // or forces its row to grow instead of wrapping.
    render(<DetailsBadge value="a-very-long-unbreakable-token-without-spaces@example.com" />)
    const valueLine = screen.getByText('a-very-long-unbreakable-token-without-spaces@example.com')
    expect(valueLine.className).toMatch(/min-w-0/)
  })
})
