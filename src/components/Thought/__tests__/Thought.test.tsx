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

import { cleanup, render, screen } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import Markdown from '@/components/markdown/Markdown'
import ChatAiMessageActions from '@/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions'
import { ChatMessage, Thought as ThoughtType, ThoughtAuthorType } from '@/types/entity/conversation'

import Thought from '../Thought'

const createMockThought = (overrides?: Partial<ThoughtType>): ThoughtType => ({
  id: 'thought-1',
  author_name: 'Test Tool',
  author_type: ThoughtAuthorType.Tool,
  message: 'Test message',
  in_progress: false,
  ...overrides,
})

const resultLines = (count: number, prefix = 'Result') =>
  Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`).join('\n')

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsText(blob)
  })

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

  it('renders headerBadge when provided', () => {
    render(
      <Thought
        thought={createMockThought()}
        headerBadge={<span data-testid="custom-badge">Badge</span>}
      />
    )

    expect(screen.getByTestId('custom-badge')).toBeInTheDocument()
  })

  it('does not render a badge when headerBadge is not provided', () => {
    render(<Thought thought={createMockThought()} />)

    expect(screen.queryByTestId('custom-badge')).not.toBeInTheDocument()
  })

  describe('getView', () => {
    const parent = createMockThought({
      id: 'parent',
      author_name: 'Parent',
      children: [createMockThought({ id: 'child', author_name: 'Child', message: 'child msg' })],
    })

    it('does not render children of a collapsed parent without getView', () => {
      render(<Thought thought={parent} />)
      expect(screen.queryByText('Child')).not.toBeInTheDocument()
    })

    it('renders the child of a collapsed parent when forceExpanded', () => {
      render(<Thought thought={parent} getView={(t) => ({ forceExpanded: t.id === 'parent' })} />)
      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('lets the user collapse nothing while forced and follows the view on rerender', () => {
      const { rerender } = render(
        <Thought thought={parent} getView={() => ({ forceExpanded: true })} />
      )
      expect(screen.getByText('Child')).toBeInTheDocument()
      rerender(<Thought thought={parent} getView={() => ({})} />)
      expect(screen.queryByText('Child')).not.toBeInTheDocument()
    })

    it('omits a hidden child', () => {
      render(
        <Thought thought={parent} defaultExpanded getView={(t) => ({ hidden: t.id === 'child' })} />
      )
      expect(screen.getByText('Parent')).toBeInTheDocument()
      expect(screen.queryByText('Child')).not.toBeInTheDocument()
    })

    it('renders the footer below the thought content', () => {
      render(
        <Thought
          thought={parent}
          defaultExpanded
          getView={(t) => ({
            forceExpanded: true,
            footer: t.id === 'child' ? <div>child footer</div> : undefined,
          })}
        />
      )
      expect(screen.getByText('child footer')).toBeInTheDocument()
    })

    it('replaces the header status with the override', () => {
      render(
        <Thought
          thought={createMockThought()}
          getView={() => ({ status: { status: 'not_started', label: 'Waiting' } })}
        />
      )
      expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Waiting')
    })
  })

  it('leaves long Input full while previewing only the tool Result', () => {
    render(
      <Thought
        defaultExpanded
        thought={createMockThought({
          input_text: resultLines(100, 'Input'),
          message: resultLines(100),
        })}
      />
    )
    expect(screen.getByText('Input 21')).toBeInTheDocument()
    expect(screen.getByText('Input 100')).toBeInTheDocument()
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Show 60 hidden lines' })).toHaveLength(1)
  })

  it('retains same-id streaming expansion and updates the collapsed latest tail', async () => {
    const thought = createMockThought({ in_progress: true, message: resultLines(59) })
    const { rerender } = render(<Thought thought={thought} />)
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines/ })).toBeNull()
    rerender(<Thought thought={{ ...thought, message: resultLines(60) }} />)
    expect(screen.getByRole('button', { name: 'Show 20 hidden lines' })).toBeInTheDocument()
    rerender(<Thought thought={{ ...thought, message: resultLines(100) }} />)
    expect(screen.queryByText('Result 41')).not.toBeInTheDocument()
    expect(screen.getByText('Result 81')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show 60 hidden lines' }))
    rerender(<Thought thought={{ ...thought, message: resultLines(101) }} />)
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByText('Result 21')).toBeInTheDocument()
    expect(screen.getByText('Result 101')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test Tool' }))
    expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.getByRole('button', { name: 'Show 61 hidden lines' })).toBeInTheDocument()
    expect(screen.queryByText('Result 81')).not.toBeInTheDocument()
    expect(screen.getByText('Result 82')).toBeInTheDocument()
  })

  it('resets disclosure when a completed card is closed and reopened', async () => {
    render(<Thought defaultExpanded thought={createMockThought({ message: resultLines(100) })} />)
    await user.click(screen.getByRole('button', { name: 'Show 60 hidden lines' }))
    expect(screen.getByText('Result 21')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test Tool' }))
    expect(screen.queryByText('Result:')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Test Tool' }))
    expect(screen.getByRole('button', { name: 'Show 60 hidden lines' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
  })

  it('previews nested missing-author tool data without affecting its parent Result', async () => {
    render(
      <Thought
        defaultExpanded
        thought={createMockThought({
          author_type: ThoughtAuthorType.Assistant,
          message: resultLines(100, 'Parent'),
          children: [
            createMockThought({
              id: 'child',
              author_name: undefined,
              author_type: undefined,
              tool_name: 'search',
              message: resultLines(100),
            }),
          ],
        })}
      />
    )
    expect(screen.getByText('Parent 21')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Show \d+ hidden lines/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'search' }))
    expect(screen.getByRole('button', { name: 'Show 60 hidden lines' })).toBeInTheDocument()
    expect(screen.queryByText('Result 21')).not.toBeInTheDocument()
    expect(screen.getByText('Parent 21')).toBeInTheDocument()
  })

  it('copies only the unchanged assistant reply in both formats across tool disclosure states', async () => {
    vi.stubGlobal(
      'ClipboardItem',
      class {
        private readonly data: Record<string, Blob>

        constructor(data: Record<string, Blob>) {
          this.data = data
        }

        getType(type: string) {
          return Promise.resolve(this.data[type])
        }
      }
    )
    const write = vi.spyOn(navigator.clipboard, 'write').mockResolvedValue(undefined)
    const thought = createMockThought({ message: resultLines(100) })
    const message: ChatMessage = {
      role: 'Assistant',
      response: 'Assistant **reply**',
      createdAt: '',
      assistant: { id: 'assistant', name: 'Assistant' },
      executionId: null,
      thoughts: [thought],
    }
    render(
      <>
        <Thought defaultExpanded thought={thought} />
        <Markdown content={message.response} />
        <ChatAiMessageActions
          isEditing
          indexes={{ historyIndex: 0, messageIndex: 0 }}
          message={message}
          totalMessages={1}
          onCancelEditing={() => {}}
          onConfirmEditing={() => {}}
          onStartEditing={() => {}}
          onChangeMessageIndex={() => {}}
        />
      </>
    )
    const assertCopiedReply = async () => {
      await user.click(screen.getByRole('button', { name: 'Copy message' }))
      const item = write.mock.calls.at(-1)![0][0]
      expect(await readBlob(await item.getType('text/plain'))).toBe('Assistant **reply**')
      expect(await readBlob(await item.getType('text/html'))).toBe(
        '<p>Assistant <strong>reply</strong></p>'
      )
      expect(screen.getByText('reply', { selector: 'strong' })).toBeInTheDocument()
    }
    await assertCopiedReply()
    await user.click(screen.getByRole('button', { name: 'Show 60 hidden lines' }))
    await assertCopiedReply()
    await user.click(screen.getByRole('button', { name: 'Collapse' }))
    await assertCopiedReply()
  })
})
