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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { WORKFLOW_OUTPUT_FORMATS } from '@/constants/workflows'
import { Thought as ThoughtType } from '@/types/entity/conversation'

import WorkflowExecutionStateThought from '../WorkflowExecutionStateThought'

vi.hoisted(() => vi.resetModules())

vi.mock('@/components/Thought/Thought', () => ({
  default: ({ thought, defaultExpanded }: { thought: ThoughtType; defaultExpanded?: boolean }) => (
    <div data-testid="thought-component">
      <div data-testid="thought-message">{thought.message}</div>
      <div data-testid="thought-output-format">{thought.output_format}</div>
      <div data-testid="thought-default-expanded">{String(defaultExpanded)}</div>
      {thought.children && thought.children.length > 0 && (
        <div data-testid="thought-children-count">{thought.children.length}</div>
      )}
    </div>
  ),
}))

describe('WorkflowExecutionStateThought', () => {
  const mockThought: ThoughtType = {
    id: 'thought-1',
    message: '',
    content: 'Test thought content',
    in_progress: false,
  }

  it('renders nothing when thought is null or undefined', () => {
    const { container } = render(<WorkflowExecutionStateThought thought={null as any} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Thought component with transformed thought', () => {
    const { getByTestId } = render(<WorkflowExecutionStateThought thought={mockThought} />)

    expect(getByTestId('thought-component')).toBeInTheDocument()
    expect(getByTestId('thought-message')).toHaveTextContent('Test thought content')
  })

  it('transforms content to message property', () => {
    const { getByTestId } = render(<WorkflowExecutionStateThought thought={mockThought} />)

    expect(getByTestId('thought-message')).toHaveTextContent('Test thought content')
  })

  it('adds markdown output format to transformed thought', () => {
    const { getByTestId } = render(<WorkflowExecutionStateThought thought={mockThought} />)

    expect(getByTestId('thought-output-format')).toHaveTextContent(WORKFLOW_OUTPUT_FORMATS.MARKDOWN)
  })
  it('transforms nested children recursively', () => {
    const thoughtWithChildren: ThoughtType = {
      id: 'parent-thought',
      message: '',
      content: 'Parent content',
      in_progress: false,
      children: [
        {
          id: 'child-1',
          message: '',
          content: 'Child 1 content',
          in_progress: false,
        },
        {
          id: 'child-2',
          message: '',
          content: 'Child 2 content',
          in_progress: false,
        },
      ],
    }

    const { getByTestId } = render(<WorkflowExecutionStateThought thought={thoughtWithChildren} />)

    expect(getByTestId('thought-children-count')).toHaveTextContent('2')
  })
})
