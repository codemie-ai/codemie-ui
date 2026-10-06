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

import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, it, expect } from 'vitest'

import Button from '../Button'

afterEach(cleanup)

describe('Button magical variant prop', () => {
  it('applies magical classes when variant="magical" is used instead of type', () => {
    render(<Button variant="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('text-text-inverse')
    expect(button).toHaveClass('hover:brightness-90')
  })

  it('variant prop takes precedence over type prop for magical', () => {
    render(
      <Button type="primary" variant="magical">
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).not.toHaveClass('bg-button-primary-bg')
  })
})

describe('Button magical variant classes', () => {
  it('renders bg-magical-button class', () => {
    // Arrange
    render(<Button type="magical">Generate with AI</Button>)
    // Act
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    // Assert
    expect(button).toHaveClass('bg-magical-button')
  })

  it('renders text-text-inverse class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('text-text-inverse')
  })

  it('renders hover:brightness-90 class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('hover:brightness-90')
  })

  it('does not render hover:brightness-110 class', () => {
    render(<Button type="magical">Generate with AI</Button>)
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).not.toHaveClass('hover:brightness-110')
  })

  it('applies disabled styling on a magical button', () => {
    render(
      <Button type="magical" disabled>
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('opacity-50')
    expect(button).toHaveClass('cursor-not-allowed')
    expect(button).toBeDisabled()
  })

  it('applies loading styling on a magical button', () => {
    const { container } = render(
      <Button type="magical" isLoading>
        Generate with AI
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Generate with AI' })
    expect(button).toHaveClass('bg-magical-button')
    expect(button).toHaveClass('cursor-wait')
    expect(button).toBeDisabled()
    // shimmer overlay is present
    expect(container.querySelector('.animate-shimmer')).not.toBeNull()
  })
})
