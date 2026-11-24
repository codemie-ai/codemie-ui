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
import userEvent from '@testing-library/user-event'
import { createRef, forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CustomNodeType, type WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import TransformTab, { TransformTabRef } from '../TransformTab'
import {
  enableWorkflowContracts,
  fillContract,
  INPUT_CONTRACT_PLACEHOLDER,
  INPUT_SCHEMA,
  modeLabel,
  OUTPUT_CONTRACT_PLACEHOLDER,
} from './contractTestUtils'

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

describe('TransformTab — contract fields', () => {
  beforeEach(() => {
    enableWorkflowContracts()
    vi.clearAllMocks()
  })

  it('renders input contract and mode but no second output control', () => {
    render(<TransformTab {...defaultProps} />)
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toBeInTheDocument()
    expect(modeLabel()).toHaveTextContent('Use workflow default')
    expect(screen.queryByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
  })

  it('saves and reloads input_schema and validation, with no state-level output control (AC1)', async () => {
    const user = userEvent.setup()
    const ref = createRef<TransformTabRef>()
    render(<TransformTab {...defaultProps} ref={ref} />)

    await fillContract(user, { input: INPUT_SCHEMA, mode: 'strict' })
    expect(await ref.current!.save()).toBe(true)

    const saved = defaultProps.onConfigChange.mock.calls[0][0].state.data
    expect(saved).toEqual(
      expect.objectContaining({ input_schema: INPUT_SCHEMA, save_validation: 'strict' })
    )

    cleanup()
    render(
      <TransformTab
        {...defaultProps}
        config={{ ...mockConfig, states: [{ ...saved, custom_node_id: 'custom-1' }] }}
      />
    )
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toHaveValue(INPUT_SCHEMA)
    expect(modeLabel()).toHaveTextContent('strict')
  })

  it('omits the validation key when the mode is unset', async () => {
    const ref = createRef<TransformTabRef>()
    render(<TransformTab {...defaultProps} ref={ref} />)

    expect(await ref.current!.save()).toBe(true)

    expect(defaultProps.onConfigChange.mock.calls[0][0].state.data.save_validation).toBeUndefined()
  })
})
