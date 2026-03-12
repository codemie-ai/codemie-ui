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
import { describe, it, expect, beforeEach, vi } from 'vitest'

import ThoughtDocument from '../ThoughtDocument'

describe('ThoughtDocument', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('displays the title', () => {
    render(<ThoughtDocument title="Test Document" />)
    expect(screen.getByText('Test Document')).toBeInTheDocument()
  })

  it('starts in collapsed state', () => {
    render(<ThoughtDocument title="Document" content="Hidden content" />)
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('expands content when clicked', async () => {
    render(<ThoughtDocument title="Document" content="Visible content" />)

    await user.click(screen.getByText('Document'))

    expect(screen.getByText('Visible content')).toBeInTheDocument()
  })

  it('collapses content when clicked again', async () => {
    render(<ThoughtDocument title="Document" content="Toggle content" />)

    const titleElement = screen.getByText('Document')
    await user.click(titleElement)
    expect(screen.getByText('Toggle content')).toBeInTheDocument()

    await user.click(titleElement)
    expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
  })

  it('renders string content', async () => {
    render(<ThoughtDocument title="Document" content="String content" />)

    await user.click(screen.getByText('Document'))

    expect(screen.getByText('String content')).toBeInTheDocument()
  })

  it('renders ReactNode content', async () => {
    const customContent = (
      <div>
        <span>Custom</span>
        <span>Content</span>
      </div>
    )
    render(<ThoughtDocument title="Document" content={customContent} />)

    await user.click(screen.getByText('Document'))

    expect(screen.getByText('Custom')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('stops event propagation when title is clicked', async () => {
    const handleParentClick = vi.fn()

    render(
      <div onClick={handleParentClick}>
        <ThoughtDocument title="Document" content="Content" />
      </div>
    )

    await user.click(screen.getByText('Document'))

    expect(handleParentClick).not.toHaveBeenCalled()
  })

  it('handles empty content gracefully', async () => {
    render(<ThoughtDocument title="Document" content="" />)

    await user.click(screen.getByText('Document'))

    // Content area should exist but be empty
    const button = screen.getByRole('button', { name: /Document/i })
    const container = button.parentElement
    expect(container?.querySelector('.p-3.pt-0')).toBeInTheDocument()
  })

  it('renders complex HTML content', async () => {
    const complexContent = (
      <div>
        <h1>Heading</h1>
        <p>Paragraph</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    )
    render(<ThoughtDocument title="Document" content={complexContent} />)

    await user.click(screen.getByText('Document'))

    expect(screen.getByText('Heading')).toBeInTheDocument()
    expect(screen.getByText('Paragraph')).toBeInTheDocument()
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})
