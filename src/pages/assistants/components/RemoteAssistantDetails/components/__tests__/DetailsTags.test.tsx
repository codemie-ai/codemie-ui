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

import DetailsTags from '../DetailsTags'

describe('DetailsTags', () => {
  it('renders the headline and items correctly', () => {
    const items = ['tag1', 'tag2', 'tag3']
    render(<DetailsTags headline="Tags:" items={items} />)

    expect(screen.getByText('Tags:')).toBeInTheDocument()
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
    expect(screen.getByText('tag3')).toBeInTheDocument()
  })

  it('renders null when items prop is undefined', () => {
    const { container } = render(<DetailsTags headline="Tags:" items={undefined} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders null when items prop is not provided', () => {
    const { container } = render(<DetailsTags headline="Tags:" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders with empty array of items', () => {
    render(<DetailsTags headline="Tags:" items={[]} />)

    expect(screen.getByText('Tags:')).toBeInTheDocument()
    // Only headline should be visible, no tags
    const tags = screen
      .queryAllByRole('generic')
      .filter((el) => el.className.includes('rounded-full'))
    expect(tags).toHaveLength(0)
  })

  it('applies correct CSS classes to headline', () => {
    render(<DetailsTags headline="Test Headline" items={['tag1']} />)

    const headline = screen.getByText('Test Headline')
    expect(headline).toHaveClass('text-xs')
    expect(headline).toHaveClass('text-text-quaternary')
  })

  it('applies correct CSS classes to container', () => {
    const { container } = render(<DetailsTags headline="Tags:" items={['tag1']} />)

    const outerDiv = container.firstChild as HTMLElement
    expect(outerDiv).toHaveClass('flex')
    expect(outerDiv).toHaveClass('flex-col')
    expect(outerDiv).toHaveClass('gap-2')
  })

  it('applies correct CSS classes to tags wrapper', () => {
    const { container } = render(<DetailsTags headline="Tags:" items={['tag1']} />)

    const tagsWrapper = container.querySelector('.flex.flex-wrap.gap-2.text-wrap.break-word')
    expect(tagsWrapper).toBeInTheDocument()
  })

  it('renders multiple tags with unique keys', () => {
    const items = ['javascript', 'typescript', 'react']
    render(<DetailsTags headline="Languages:" items={items} />)

    items.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })

  it('renders single tag', () => {
    render(<DetailsTags headline="Single Tag:" items={['solo']} />)

    expect(screen.getByText('Single Tag:')).toBeInTheDocument()
    expect(screen.getByText('solo')).toBeInTheDocument()
  })

  it('handles tags with special characters', () => {
    const items = ['tag-with-dash', 'tag_with_underscore', 'tag.with.dot']
    render(<DetailsTags headline="Special Tags:" items={items} />)

    items.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })
})
