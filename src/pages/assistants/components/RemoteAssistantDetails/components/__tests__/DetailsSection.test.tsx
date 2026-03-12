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

import DetailsSection from '../DetailsSection'

describe('DetailsSection', () => {
  it('renders the headline and children correctly', () => {
    render(
      <DetailsSection headline="Test Section">
        <div>Child content</div>
      </DetailsSection>
    )

    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('applies correct CSS classes to headline', () => {
    render(<DetailsSection headline="Test Headline">Content</DetailsSection>)

    const headline = screen.getByText('Test Headline')
    expect(headline).toHaveClass('font-bold')
    expect(headline).toHaveClass('text-xs')
    expect(headline.tagName).toBe('H5')
  })

  it('applies correct CSS classes to outer container', () => {
    const { container } = render(<DetailsSection headline="Test">Content</DetailsSection>)

    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv).toHaveClass('flex')
    expect(outerDiv).toHaveClass('flex-col')
    expect(outerDiv).toHaveClass('gap-2')
  })

  it('applies correct CSS classes to children container', () => {
    render(
      <DetailsSection headline="Test">
        <div data-testid="child">Content</div>
      </DetailsSection>
    )

    const child = screen.getByTestId('child')
    const childrenContainer = child.parentElement
    expect(childrenContainer).toHaveClass('flex')
    expect(childrenContainer).toHaveClass('flex-col')
    expect(childrenContainer).toHaveClass('gap-2')
  })

  it('applies custom className to children container', () => {
    render(
      <DetailsSection headline="Test" className="custom-class">
        <div data-testid="child">Content</div>
      </DetailsSection>
    )

    const child = screen.getByTestId('child')
    const childrenContainer = child.parentElement
    expect(childrenContainer).toHaveClass('custom-class')
    expect(childrenContainer).toHaveClass('flex')
    expect(childrenContainer).toHaveClass('flex-col')
    expect(childrenContainer).toHaveClass('gap-2')
  })

  it('renders multiple children', () => {
    render(
      <DetailsSection headline="Multiple Children">
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </DetailsSection>
    )

    expect(screen.getByText('Multiple Children')).toBeInTheDocument()
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('renders with React components as children', () => {
    const ChildComponent = () => <div>Component child</div>

    render(
      <DetailsSection headline="Component Children">
        <ChildComponent />
      </DetailsSection>
    )

    expect(screen.getByText('Component child')).toBeInTheDocument()
  })

  it('renders with nested elements', () => {
    render(
      <DetailsSection headline="Nested">
        <div>
          <span>Nested span</span>
          <p>Nested paragraph</p>
        </div>
      </DetailsSection>
    )

    expect(screen.getByText('Nested span')).toBeInTheDocument()
    expect(screen.getByText('Nested paragraph')).toBeInTheDocument()
  })

  it('combines custom className with default classes using cn utility', () => {
    render(
      <DetailsSection headline="Test" className="mt-4 border">
        <div data-testid="child">Content</div>
      </DetailsSection>
    )

    const child = screen.getByTestId('child')
    const childrenContainer = child.parentElement
    expect(childrenContainer).toHaveClass('flex')
    expect(childrenContainer).toHaveClass('flex-col')
    expect(childrenContainer).toHaveClass('gap-2')
    expect(childrenContainer).toHaveClass('mt-4')
    expect(childrenContainer).toHaveClass('border')
  })

  it('renders with empty string as headline', () => {
    render(<DetailsSection headline="">Content</DetailsSection>)

    const headline = screen.getByRole('heading', { level: 5 })
    expect(headline).toBeInTheDocument()
    expect(headline).toBeEmptyDOMElement()
  })
})
