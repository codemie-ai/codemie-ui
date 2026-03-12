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
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'

import ThoughtHeader from '../ThoughtHeader'

const createMockThought = (overrides?: Partial<Thought>): Thought => ({
  id: 'thought-1',
  author_name: 'Test Tool',
  author_type: ThoughtAuthorType.Tool,
  message: 'Test message',
  in_progress: false,
  ...overrides,
})

describe('ThoughtHeader', () => {
  let user: UserEvent
  const mockSetIsExpanded = vi.fn()

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <ThoughtHeader thought={createMockThought()} setIsExpanded={mockSetIsExpanded} />
    )
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the tool name correctly', () => {
    render(<ThoughtHeader thought={createMockThought()} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('Test Tool')).toBeInTheDocument()
  })

  it('displays tool_name when author_name is not provided', () => {
    const thought = createMockThought({ author_name: undefined, tool_name: 'custom_tool' })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('custom_tool')).toBeInTheDocument()
  })

  it('displays "Tool" as fallback when neither author_name nor tool_name is provided', () => {
    const thought = createMockThought({ author_name: undefined, tool_name: undefined })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('Tool')).toBeInTheDocument()
  })

  it('renders author icon container for tool author type', () => {
    render(<ThoughtHeader thought={createMockThought()} setIsExpanded={mockSetIsExpanded} />)
    const iconContainer = screen.getByText('Test Tool').previousElementSibling
    expect(iconContainer).toBeInTheDocument()
    expect(iconContainer).toHaveAttribute('data-tooltip-content', ThoughtAuthorType.Tool)
  })

  it('renders author icon container for assistant author type', () => {
    const thought = createMockThought({
      author_name: 'Test Assistant',
      author_type: ThoughtAuthorType.Assistant,
    })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    const iconContainer = screen.getByText('Test Assistant').previousElementSibling
    expect(iconContainer).toBeInTheDocument()
    expect(iconContainer).toHaveAttribute('data-tooltip-content', ThoughtAuthorType.Assistant)
  })

  it('shows chevron icon when not in progress', () => {
    const { container } = render(
      <ThoughtHeader
        thought={createMockThought()}
        isInProgress={false}
        setIsExpanded={mockSetIsExpanded}
      />
    )
    const chevron = container.querySelector('svg')
    expect(chevron).toBeInTheDocument()
  })

  it('hides chevron icon when in progress', () => {
    const thought = createMockThought({ in_progress: true })
    const { container } = render(
      <ThoughtHeader thought={thought} isInProgress={true} setIsExpanded={mockSetIsExpanded} />
    )
    const firstSvg = container.querySelector('svg.size-4.min-w-4')
    expect(firstSvg).not.toBeInTheDocument()
  })

  it('calls setIsExpanded with toggled value when clicked', async () => {
    render(
      <ThoughtHeader
        thought={createMockThought()}
        isExpanded={false}
        setIsExpanded={mockSetIsExpanded}
      />
    )

    const header = screen.getByText('Test Tool').closest('div')
    if (header) {
      await user.click(header)
      expect(mockSetIsExpanded).toHaveBeenCalledWith(true)
    }
  })

  it('calls setIsExpanded with toggled value when expanded and clicked', async () => {
    render(
      <ThoughtHeader
        thought={createMockThought()}
        isExpanded={true}
        setIsExpanded={mockSetIsExpanded}
      />
    )

    const header = screen.getByText('Test Tool').closest('div')
    if (header) {
      await user.click(header)
      expect(mockSetIsExpanded).toHaveBeenCalledWith(false)
    }
  })

  it('displays input text when provided', () => {
    const thought = createMockThought({
      author_name: 'Tool With Input',
      input_text: 'Search query here',
    })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('Search query here')).toBeInTheDocument()
  })

  it('does not display input text section when not provided', () => {
    render(<ThoughtHeader thought={createMockThought()} setIsExpanded={mockSetIsExpanded} />)
    const container = screen.getByText('Test Tool').closest('div')
    expect(container?.textContent).not.toContain('input_text')
  })

  it('shows success badge when not in progress and no error', () => {
    render(
      <ThoughtHeader
        thought={createMockThought()}
        isInProgress={false}
        setIsExpanded={mockSetIsExpanded}
      />
    )
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('shows error badge when thought has error', () => {
    const thought = createMockThought({ error: true })
    render(
      <ThoughtHeader thought={thought} isInProgress={false} setIsExpanded={mockSetIsExpanded} />
    )
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('shows in progress badge when in progress', () => {
    const thought = createMockThought({ in_progress: true })
    render(
      <ThoughtHeader thought={thought} isInProgress={true} setIsExpanded={mockSetIsExpanded} />
    )
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('hides author icon when isEmbedded is true', () => {
    const { container } = render(
      <ThoughtHeader
        thought={createMockThought()}
        isEmbedded={true}
        setIsExpanded={mockSetIsExpanded}
      />
    )
    const tooltipContainer = container.querySelector('[data-tooltip-id="react-tooltip"]')
    expect(tooltipContainer).not.toBeInTheDocument()
  })

  it('shows author icon when isEmbedded is false', () => {
    const { container } = render(
      <ThoughtHeader
        thought={createMockThought()}
        isEmbedded={false}
        setIsExpanded={mockSetIsExpanded}
      />
    )
    const tooltipContainer = container.querySelector('[data-tooltip-id="react-tooltip"]')
    expect(tooltipContainer).toBeInTheDocument()
  })

  it('hides status indicators but shows badges when isEmbedded is true', () => {
    const { container } = render(
      <ThoughtHeader
        thought={createMockThought()}
        isEmbedded={true}
        setIsExpanded={mockSetIsExpanded}
      />
    )
    const statusIndicatorContainer = container.querySelector('.min-h-4')
    expect(statusIndicatorContainer).not.toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('trims whitespace from author_name', () => {
    const thought = createMockThought({ author_name: '  Spaced Tool  ' })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('Spaced Tool')).toBeInTheDocument()
  })

  it('trims whitespace from tool_name', () => {
    const thought = createMockThought({
      author_name: undefined,
      tool_name: '  spaced_tool  ',
    })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    expect(screen.getByText('spaced_tool')).toBeInTheDocument()
  })

  it('sets tooltip content with author type', () => {
    const { container } = render(
      <ThoughtHeader thought={createMockThought()} setIsExpanded={mockSetIsExpanded} />
    )
    const tooltipContainer = container.querySelector('[data-tooltip-id="react-tooltip"]')
    expect(tooltipContainer).toHaveAttribute('data-tooltip-content', ThoughtAuthorType.Tool)
  })

  it('sets title attribute on input text for full text display', () => {
    const thought = createMockThought({ input_text: 'Search query here' })
    render(<ThoughtHeader thought={thought} setIsExpanded={mockSetIsExpanded} />)
    const inputText = screen.getByText('Search query here')
    expect(inputText).toHaveAttribute('title', 'Search query here')
  })
})
