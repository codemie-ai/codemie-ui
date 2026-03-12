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

import DetailsTag from '../DetailsTag'

describe('DetailsTag', () => {
  it('renders the tag with the provided value', () => {
    render(<DetailsTag value="test-tag" />)

    const tag = screen.getByText('test-tag')
    expect(tag).toBeInTheDocument()
  })

  it('applies correct CSS classes for styling', () => {
    render(<DetailsTag value="sample" />)

    const tag = screen.getByText('sample')
    expect(tag).toHaveClass('rounded-full')
    expect(tag).toHaveClass('w-fit')
    expect(tag).toHaveClass('py-0.5')
    expect(tag).toHaveClass('px-2')
    expect(tag).toHaveClass('border')
    expect(tag).toHaveClass('border-in-progress-secondary')
    expect(tag).toHaveClass('bg-in-progress-tertiary')
    expect(tag).toHaveClass('text-in-progress-primary')
    expect(tag).toHaveClass('text-xs')
    expect(tag).toHaveClass('font-semibold')
    expect(tag).toHaveClass('uppercase')
  })

  it('displays text in uppercase', () => {
    render(<DetailsTag value="lowercase" />)

    const tag = screen.getByText('lowercase')
    expect(tag).toHaveClass('uppercase')
  })

  it('renders with special characters in value', () => {
    render(<DetailsTag value="tag-with-special!@#" />)

    expect(screen.getByText('tag-with-special!@#')).toBeInTheDocument()
  })

  it('renders with numeric value as string', () => {
    render(<DetailsTag value="123" />)

    expect(screen.getByText('123')).toBeInTheDocument()
  })

  it('renders with empty string value', () => {
    const { container } = render(<DetailsTag value="" />)

    const tag = container.querySelector('div')
    expect(tag).toBeInTheDocument()
    expect(tag).toBeEmptyDOMElement()
  })
})
