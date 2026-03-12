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

import SidebarTags from '../SidebarTags'

const mockItems = [
  { value: 'Tag 1', icon: <span data-testid="icon">Icon</span>, onClick: vi.fn() },
  { value: 'Tag 2' },
]

describe('SidebarTags Component', () => {
  it('renders with the label and labelIcon', () => {
    render(<SidebarTags label="Test Label" labelIcon={<span>Icon</span>} />)

    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })

  it('uses labelClassName for the label', () => {
    render(<SidebarTags label="Test Label" labelClassName="custom-label-class" />)

    const labelElement = screen.getByText('Test Label')
    expect(labelElement).toHaveClass('custom-label-class')
  })

  it('shows the noItemsMessage when items are empty', () => {
    render(<SidebarTags noItemsMessage="No items found" label="" />)

    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders a list of items', () => {
    render(<SidebarTags items={mockItems} label="" />)

    expect(screen.getByText('Tag 1')).toBeInTheDocument()
    expect(screen.getByText('Tag 2')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('calls onClick when item with onClick handler is clicked', () => {
    render(<SidebarTags items={mockItems} label="" />)

    const tag1 = screen.getByText('Tag 1')
    fireEvent.click(tag1)

    expect(mockItems[0].onClick).toHaveBeenCalledTimes(1)
  })

  it('renders items without onClick handler as non-clickable', () => {
    render(<SidebarTags items={mockItems} label="" />)

    const tag2 = screen.getByText('Tag 2')
    fireEvent.click(tag2)

    // No errors should occur here, and no onClick handler is called
    expect(mockItems[1].onClick).toBeUndefined()
  })

  it('applies the correct className to the container', () => {
    render(<SidebarTags className="custom-class" label="" />)

    const container = screen.getByText((_, node) => node?.className.includes('custom-class') as any)
    expect(container).toBeInTheDocument()
  })
})
