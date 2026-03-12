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
import { describe, it, expect } from 'vitest'

import DetailsItem from '../DetailsItem'

describe('DetailsItem', () => {
  it('renders icon, title, and description correctly', () => {
    const icon = <span data-testid="test-icon">Icon</span>
    render(<DetailsItem icon={icon} title="Test Title" description="Test Description" />)

    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('applies correct CSS classes to main container', () => {
    const icon = <span>Icon</span>
    const { container } = render(
      <DetailsItem icon={icon} title="Title" description="Description" />
    )

    const mainDiv = container.firstChild as HTMLElement
    expect(mainDiv).toHaveClass('flex')
    expect(mainDiv).toHaveClass('gap-4')
  })

  it('applies correct CSS classes to icon container', () => {
    const icon = <span data-testid="icon">Icon</span>
    render(<DetailsItem icon={icon} title="Title" description="Description" />)

    const iconElement = screen.getByTestId('icon')
    const iconContainer = iconElement.parentElement
    expect(iconContainer).toHaveClass('mt-0.5')
    expect(iconContainer).toHaveClass('flex')
    expect(iconContainer).toHaveClass('justify-center')
    expect(iconContainer).toHaveClass('items-center')
    expect(iconContainer).toHaveClass('size-8')
    expect(iconContainer).toHaveClass('min-w-8')
    expect(iconContainer).toHaveClass('rounded-lg')
    expect(iconContainer).toHaveClass('border')
    expect(iconContainer).toHaveClass('border-border-specific-panel-outline')
  })

  it('applies correct CSS classes to text container', () => {
    const icon = <span>Icon</span>
    render(<DetailsItem icon={icon} title="Title" description="Description" />)

    const title = screen.getByText('Title')
    const textContainer = title.parentElement
    expect(textContainer).toHaveClass('flex')
    expect(textContainer).toHaveClass('text-xs')
    expect(textContainer).toHaveClass('flex-col')
    expect(textContainer).toHaveClass('gap-1')
  })

  it('applies correct CSS classes to title', () => {
    const icon = <span>Icon</span>
    render(<DetailsItem icon={icon} title="Title" description="Description" />)

    const title = screen.getByText('Title')
    expect(title.tagName).toBe('P')
  })

  it('applies correct CSS classes to description', () => {
    const icon = <span>Icon</span>
    render(<DetailsItem icon={icon} title="Title" description="Test Description" />)

    const description = screen.getByText('Test Description')
    expect(description).toHaveClass('text-text-quaternary')
    expect(description.tagName).toBe('P')
  })

  it('renders with SVG icon', () => {
    const icon = (
      <svg data-testid="svg-icon">
        <circle cx="10" cy="10" r="5" />
      </svg>
    )
    render(<DetailsItem icon={icon} title="SVG Test" description="Description" />)

    expect(screen.getByTestId('svg-icon')).toBeInTheDocument()
  })

  it('renders with complex icon component', () => {
    const ComplexIcon = () => (
      <div data-testid="complex-icon">
        <span>Complex</span>
      </div>
    )
    render(<DetailsItem icon={<ComplexIcon />} title="Title" description="Description" />)

    expect(screen.getByTestId('complex-icon')).toBeInTheDocument()
  })

  it('renders with long title text', () => {
    const icon = <span>Icon</span>
    const longTitle = 'This is a very long title that might wrap to multiple lines'
    render(<DetailsItem icon={icon} title={longTitle} description="Description" />)

    expect(screen.getByText(longTitle)).toBeInTheDocument()
  })

  it('renders with long description text', () => {
    const icon = <span>Icon</span>
    const longDescription =
      'This is a very long description that might wrap to multiple lines and should still be displayed correctly'
    render(<DetailsItem icon={icon} title="Title" description={longDescription} />)

    expect(screen.getByText(longDescription)).toBeInTheDocument()
  })

  it('renders with empty strings for title and description', () => {
    const icon = <span data-testid="icon">Icon</span>
    render(<DetailsItem icon={icon} title="" description="" />)

    expect(screen.getByTestId('icon')).toBeInTheDocument()
    const paragraphs = screen.getAllByRole('paragraph')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]).toBeEmptyDOMElement()
    expect(paragraphs[1]).toBeEmptyDOMElement()
  })

  it('renders with special characters in title and description', () => {
    const icon = <span>Icon</span>
    render(
      <DetailsItem
        icon={icon}
        title="Title with special chars: @#$%"
        description="Description with special chars: &*()!"
      />
    )

    expect(screen.getByText('Title with special chars: @#$%')).toBeInTheDocument()
    expect(screen.getByText('Description with special chars: &*()!')).toBeInTheDocument()
  })
})
