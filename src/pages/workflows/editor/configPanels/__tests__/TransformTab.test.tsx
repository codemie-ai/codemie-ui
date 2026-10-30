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
import { forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CustomNodeType, type WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import TransformTab from '../TransformTab'

vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    activeIssue: null,
    setActiveIssue: vi.fn(),
    getIssueField: vi.fn().mockReturnValue({
      ref: { current: null },
      fieldError: undefined,
      onChange: vi.fn(),
    }),
    markIssueDirty: vi.fn(),
    issues: [],
  }),
  WorkflowContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

vi.mock('../components/TransformForm', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      validate: () => Promise.resolve(true),
      getValues: () => ({
        input_source: 'context_store',
        on_error: 'fail',
        mappings: [],
      }),
      isDirty: () => false,
      reset: vi.fn(),
    }))
    return <div data-testid="transform-form" />
  }),
}))

const mockConfig: WorkflowConfiguration = {
  states: [
    {
      id: 'state-1',
      custom_node_id: 'custom-1',
    } as any,
  ],
  custom_nodes: [
    {
      id: 'custom-1',
      custom_node_id: CustomNodeType.TRANSFORM,
    },
  ],
}

const defaultProps = {
  stateId: 'state-1',
  config: mockConfig,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe('TransformTab — Task/Output Schema visibility (unchanged by this story)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render Task or Output Schema', () => {
    render(<TransformTab {...defaultProps} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('still renders the State Settings fields it showed before this story (State ID)', () => {
    render(<TransformTab {...defaultProps} />)
    expect(screen.getByPlaceholderText('e.g., analyze_code')).toBeInTheDocument()
  })

  it('still hides the other State Settings fields bundled under showAllFields, same as before this story', () => {
    render(<TransformTab {...defaultProps} />)
    expect(screen.queryByText('Interrupt Before')).not.toBeInTheDocument()
    expect(screen.queryByText('Finish Iteration')).not.toBeInTheDocument()
    expect(screen.queryByText('Resolve Dynamic Values in Prompt')).not.toBeInTheDocument()
    expect(screen.queryByText('Result as Human Message')).not.toBeInTheDocument()
  })
})
