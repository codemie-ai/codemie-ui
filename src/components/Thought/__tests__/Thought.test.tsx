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
import { describe, it, expect, beforeEach } from 'vitest'

import { Thought as ThoughtType, ThoughtAuthorType } from '@/types/entity/conversation'

import Thought from '../Thought'

const createMockThought = (overrides?: Partial<ThoughtType>): ThoughtType => ({
  id: 'thought-1',
  author_name: 'Test Tool',
  author_type: ThoughtAuthorType.Tool,
  message: 'Test message',
  in_progress: false,
  ...overrides,
})

describe('Thought', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
  })

  it('renders thought header with tool name', () => {
    render(<Thought thought={createMockThought()} />)
    expect(screen.getByText('Test Tool')).toBeInTheDocument()
  })

  it('starts in collapsed state', () => {
    render(<Thought thought={createMockThought()} />)
    expect(screen.queryByText('Result:')).not.toBeInTheDocument()
  })

  it('shows content when expanded', async () => {
    render(<Thought thought={createMockThought()} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Result:')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('hides content when collapsed after being expanded', async () => {
    render(<Thought thought={createMockThought()} />)

    const header = screen.getByText('Test Tool').closest('div')!
    await user.click(header)
    expect(screen.getByText('Result:')).toBeInTheDocument()

    await user.click(header)
    expect(screen.queryByText('Result:')).not.toBeInTheDocument()
  })

  it('shows content when thought is in progress', () => {
    const thought = createMockThought({ in_progress: true })
    render(<Thought thought={thought} />)

    expect(screen.getByText('Result:')).toBeInTheDocument()
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('keeps content visible when in progress', async () => {
    const thought = createMockThought({ in_progress: true })
    render(<Thought thought={thought} />)

    expect(screen.getByText('Result:')).toBeInTheDocument()

    await user.click(screen.getByText('Test Tool').closest('div')!)
    expect(screen.getByText('Result:')).toBeInTheDocument()
  })

  it('displays Result section when expanded', async () => {
    render(<Thought thought={createMockThought()} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Result:')).toBeInTheDocument()
  })

  it('displays input text when provided', async () => {
    const thought = createMockThought({ input_text: 'Test input' })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Input:')).toBeInTheDocument()
    expect(screen.getAllByText('Test input').length).toBeGreaterThan(0)
  })

  it('does not display input section when input_text is not provided', async () => {
    render(<Thought thought={createMockThought()} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.queryByText('Input:')).not.toBeInTheDocument()
  })

  it('renders child thoughts when expanded', async () => {
    const thought = createMockThought({
      children: [
        createMockThought({
          id: 'child-1',
          author_name: 'Child Tool 1',
          message: 'Child message 1',
        }),
        createMockThought({
          id: 'child-2',
          author_name: 'Child Tool 2',
          message: 'Child message 2',
        }),
      ],
    })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Child Tool 1')).toBeInTheDocument()
    expect(screen.getByText('Child Tool 2')).toBeInTheDocument()
  })

  it('does not render children section when no children exist', async () => {
    render(<Thought thought={createMockThought()} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    const allToolNames = screen.queryAllByText(/Tool/)
    expect(allToolNames.length).toBe(1) // Only parent
  })

  it('does not render children section when children array is empty', async () => {
    const thought = createMockThought({ children: [] })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    const allToolNames = screen.queryAllByText(/Tool/)
    expect(allToolNames.length).toBe(1)
  })

  it('renders nested child thoughts recursively', async () => {
    const thought = createMockThought({
      author_name: 'Parent Tool',
      children: [
        createMockThought({
          id: 'child-1',
          author_name: 'Child Tool',
          children: [
            createMockThought({
              id: 'grandchild-1',
              author_name: 'Grandchild Tool',
            }),
          ],
        }),
      ],
    })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Parent Tool').closest('div')!)

    expect(screen.getByText('Parent Tool')).toBeInTheDocument()
    expect(screen.getByText('Child Tool')).toBeInTheDocument()

    // Expand child to see grandchild
    await user.click(screen.getByText('Child Tool').closest('div')!)

    expect(screen.getByText('Grandchild Tool')).toBeInTheDocument()
  })

  it('renders both input and children when both are provided', async () => {
    const thought = createMockThought({
      input_text: 'Unique test input here',
      children: [createMockThought({ id: 'child-1', author_name: 'Child Tool' })],
    })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Input:')).toBeInTheDocument()
    expect(screen.getAllByText('Unique test input here').length).toBeGreaterThan(0)
    expect(screen.getByText('Child Tool')).toBeInTheDocument()
  })

  it('displays message in result section', async () => {
    const thought = createMockThought({ message: 'Custom message content' })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Test Tool').closest('div')!)

    expect(screen.getByText('Custom message content')).toBeInTheDocument()
  })

  it('shows success badge when not in progress and no error', () => {
    render(<Thought thought={createMockThought()} />)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('shows in progress badge when in progress', () => {
    const thought = createMockThought({ in_progress: true })
    render(<Thought thought={thought} />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('shows failed badge when thought has error', () => {
    const thought = createMockThought({ error: true })
    render(<Thought thought={thought} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('child thoughts can be independently expanded', async () => {
    const thought = createMockThought({
      author_name: 'Parent',
      children: [
        createMockThought({ id: 'child-1', author_name: 'Child 1', message: 'Message 1' }),
        createMockThought({ id: 'child-2', author_name: 'Child 2', message: 'Message 2' }),
      ],
    })
    render(<Thought thought={thought} />)

    await user.click(screen.getByText('Parent').closest('div')!)

    // Child messages should not be visible yet
    expect(screen.queryByText('Message 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Message 2')).not.toBeInTheDocument()

    // Expand first child
    await user.click(screen.getByText('Child 1').closest('div')!)
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.queryByText('Message 2')).not.toBeInTheDocument()

    // Expand second child
    await user.click(screen.getByText('Child 2').closest('div')!)
    expect(screen.getByText('Message 1')).toBeInTheDocument()
    expect(screen.getByText('Message 2')).toBeInTheDocument()
  })
})
