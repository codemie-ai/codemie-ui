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
import { expect, describe, it } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import StatusLabel from '../StatusLabel'

describe('StatusLabel', () => {
  const createMockAssistant = (isGlobal = false): Assistant =>
    ({
      id: 'test-id',
      name: 'Test Assistant',
      description: 'Test Description',
      is_global: isGlobal,
      unique_users_count: isGlobal ? 42 : undefined,
    } as Assistant)

  it('renders Global Assistant status when assistant is global', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('42 total uses')
    // Check for SVG icon
    const svgElement = statusElement.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('renders Shared with Project status when isShared is true', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isShared={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('Shared with Project')
    expect(statusElement).toHaveClass('flex', 'items-center')
    expect(statusElement).toHaveAttribute('aria-label', 'Shared with Project')
    // Check for SVG icon
    const svgElement = statusElement.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('renders Not shared status when isOwned is true', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isOwned={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('Not shared')
    expect(statusElement).toHaveClass('flex', 'items-center')
    expect(statusElement).toHaveAttribute('aria-label', 'Not shared')
    // Check for SVG icon
    const svgElement = statusElement.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('renders Not shared status by default', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('Not shared')
    expect(statusElement).toHaveClass('flex', 'items-center')
    expect(statusElement).toHaveAttribute('aria-label', 'Not shared')
    // Check for SVG icon
    const svgElement = statusElement.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('prioritizes global status over other statuses', () => {
    const mockAssistant = createMockAssistant(true)

    render(<StatusLabel assistant={mockAssistant} isShared={true} isOwned={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('42 total uses')
  })

  it('prioritizes shared status over owned status', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} isShared={true} isOwned={true} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveTextContent('Shared with Project')
  })

  it('has the correct gap spacing between icon and text', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('gap-3')
  })

  it('prevents text wrapping with whitespace-nowrap', () => {
    const mockAssistant = createMockAssistant(false)

    render(<StatusLabel assistant={mockAssistant} />)

    const statusElement = screen.getByRole('status')
    expect(statusElement).toHaveClass('whitespace-nowrap')
  })
})
