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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ChatsSidebarSection from '../ChatSidebarSection'

vi.mock('@/assets/icons/chevron-right.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}))

describe('ChatsSidebarSection', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders with title and chevron icon', () => {
    const { container } = render(<ChatsSidebarSection title="Recent Chats" />)

    expect(container.firstChild).toBeInTheDocument()
    expect(screen.getByText('Recent Chats', { exact: false })).toBeInTheDocument()
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('handles various title formats correctly', () => {
    const { rerender } = render(<ChatsSidebarSection title="my section" />)
    expect(screen.getByText('my section', { exact: false })).toBeInTheDocument()

    const longTitle = 'This is a very long section title that might wrap to multiple lines'
    rerender(<ChatsSidebarSection title={longTitle} />)
    expect(screen.getByText(longTitle, { exact: false })).toBeInTheDocument()

    rerender(<ChatsSidebarSection title="Test & Section! #123" />)
    expect(screen.getByText('Test & Section! #123', { exact: false })).toBeInTheDocument()

    rerender(<ChatsSidebarSection title="" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders single and multiple children', () => {
    const { rerender } = render(
      <ChatsSidebarSection title="Test Section">
        <div data-testid="child-content">Child Content</div>
      </ChatsSidebarSection>
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()

    rerender(
      <ChatsSidebarSection title="Test Section">
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
        <div data-testid="child-3">Third Child</div>
      </ChatsSidebarSection>
    )
    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
    expect(screen.getByTestId('child-3')).toBeInTheDocument()
  })

  it('renders complex and nested children content', () => {
    const NestedComponent = () => (
      <div data-testid="nested">
        <span>Nested Content</span>
      </div>
    )

    const { rerender } = render(
      <ChatsSidebarSection title="Test Section">
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </ChatsSidebarSection>
    )
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()

    rerender(
      <ChatsSidebarSection title="Test Section">
        <NestedComponent />
      </ChatsSidebarSection>
    )
    expect(screen.getByTestId('nested')).toBeInTheDocument()
    expect(screen.getByText('Nested Content')).toBeInTheDocument()
  })

  it('starts expanded and toggles accordion on click', async () => {
    render(
      <ChatsSidebarSection title="Test Section">
        <div data-testid="content">Content</div>
      </ChatsSidebarSection>
    )

    const header = screen.getByRole('button')
    expect(screen.getByTestId('content')).toBeInTheDocument()

    await user.click(header)
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })

    await user.click(header)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })

  it('maintains state across multiple toggle interactions', async () => {
    render(
      <ChatsSidebarSection title="Test Section">
        <div data-testid="content">Content</div>
      </ChatsSidebarSection>
    )

    const header = screen.getByRole('button')

    expect(screen.getByTestId('content')).toBeInTheDocument()

    await user.click(header)
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })

    await user.click(header)
    await waitFor(() => {
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    await user.click(header)
    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('handles keyboard interaction', async () => {
    render(
      <ChatsSidebarSection title="Test Section">
        <div data-testid="content">Content</div>
      </ChatsSidebarSection>
    )

    const header = screen.getByRole('button')
    header.focus()

    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.queryByTestId('content')).not.toBeInTheDocument()
    })
  })

  it('rotates chevron based on accordion state', async () => {
    render(
      <ChatsSidebarSection title="Test Section">
        <div>Content</div>
      </ChatsSidebarSection>
    )

    const header = screen.getByRole('button')
    const chevron = screen.getByTestId('chevron-icon')

    expect(chevron).toHaveClass('rotate-90')
    expect(chevron).toHaveClass('transition')

    await user.click(header)

    expect(chevron).not.toHaveClass('rotate-90')
  })

  it('applies correct structural and styling classes', () => {
    const { container } = render(
      <ChatsSidebarSection title="Test Section">
        <div>Content</div>
      </ChatsSidebarSection>
    )

    const accordion = container.querySelector('.p-accordion')
    expect(accordion).toBeInTheDocument()

    const headerDiv = container.querySelector('.flex.items-center.gap-2')
    expect(headerDiv).toHaveClass('flex', 'items-center', 'gap-2', 'font-bold', 'uppercase')
  })

  it('preserves children content when toggling accordion', async () => {
    let renderCount = 0
    const TestChild = () => {
      renderCount += 1
      return <div data-testid="test-child">Child {renderCount}</div>
    }

    render(
      <ChatsSidebarSection title="Test Section">
        <TestChild />
      </ChatsSidebarSection>
    )

    const header = screen.getByRole('button')

    expect(screen.getByTestId('test-child')).toHaveTextContent('Child 1')

    await user.click(header)
    await user.click(header)

    expect(screen.getByTestId('test-child')).toBeInTheDocument()
  })
})
