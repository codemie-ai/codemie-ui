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

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, forwardRef, useEffect, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CustomNodeType, WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import CustomTab, { CustomTabRef } from '../CustomTab'

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

vi.mock('../components/CustomNodeForm', () => ({
  default: forwardRef(({ onCustomNodeIdChange, customNodeConfig }: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      getValues: () => ({
        custom_node_id: customNodeConfig.custom_node_id,
        name: '',
        model: '',
        system_prompt: '',
        config: {},
      }),
      validate: () => Promise.resolve(true),
      isDirty: () => false,
      reset: vi.fn(),
    }))

    useEffect(() => {
      onCustomNodeIdChange?.(customNodeConfig.custom_node_id)
    }, [customNodeConfig.custom_node_id])

    return (
      <button onClick={() => onCustomNodeIdChange?.(CustomNodeType.STATE_PROCESSOR)}>
        change-to-state-processor
      </button>
    )
  }),
}))

const buildConfig = (customNodeId: CustomNodeType): WorkflowConfiguration => ({
  states: [
    {
      id: 'state-1',
      custom_node_id: 'custom-1',
    } as any,
  ],
  custom_nodes: [
    {
      id: 'custom-1',
      custom_node_id: customNodeId,
    },
  ],
})

const defaultProps = {
  project: 'test-project',
  stateId: 'state-1',
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe('CustomTab — Task/Output Schema visibility', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('shows Output Schema hidden and Task visible for state_processor', () => {
    render(<CustomTab {...defaultProps} config={buildConfig(CustomNodeType.STATE_PROCESSOR)} />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('hides Task for generate_documents_tree', () => {
    render(
      <CustomTab {...defaultProps} config={buildConfig(CustomNodeType.GENERATE_DOCUMENT_TREE)} />
    )
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  })

  it('hides Task for result_finalizer_node', () => {
    render(<CustomTab {...defaultProps} config={buildConfig(CustomNodeType.RESULT_FINALIZER)} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  })

  it('hides Task for supervisor_node', () => {
    render(<CustomTab {...defaultProps} config={buildConfig(CustomNodeType.SUPERVISOR)} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  })

  it('hides Task for summarize_conversation_node', () => {
    render(
      <CustomTab {...defaultProps} config={buildConfig(CustomNodeType.SUMMARIZE_CONVERSATION)} />
    )
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  })

  it.each([
    CustomNodeType.STATE_PROCESSOR,
    CustomNodeType.GENERATE_DOCUMENT_TREE,
    CustomNodeType.RESULT_FINALIZER,
    CustomNodeType.SUPERVISOR,
    CustomNodeType.SUMMARIZE_CONVERSATION,
  ])('hides Output Schema for %s', (customNodeType) => {
    render(<CustomTab {...defaultProps} config={buildConfig(customNodeType)} />)
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('hides Task when the Custom node has no custom_node_id yet', () => {
    const configWithoutCustomNodeId: WorkflowConfiguration = {
      states: [
        {
          id: 'state-1',
          custom_node_id: 'custom-1',
        } as any,
      ],
      custom_nodes: [
        {
          id: 'custom-1',
        },
      ],
    }
    render(<CustomTab {...defaultProps} config={configWithoutCustomNodeId} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
  })

  it('updates Task visibility live when the custom node type changes in-panel', async () => {
    render(
      <CustomTab {...defaultProps} config={buildConfig(CustomNodeType.GENERATE_DOCUMENT_TREE)} />
    )
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'change-to-state-processor' }))

    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
  })

  it('preserves stored (but hidden) task/output_schema through edit -> save -> reopen', async () => {
    const configWithStoredValues: WorkflowConfiguration = {
      states: [
        {
          id: 'state-1',
          custom_node_id: 'custom-1',
          task: 'existing task',
          output_schema: '{"type":"object"}',
        } as any,
      ],
      custom_nodes: [
        {
          id: 'custom-1',
          custom_node_id: CustomNodeType.STATE_PROCESSOR,
        },
      ],
    }

    const ref = createRef<CustomTabRef>()
    render(<CustomTab {...defaultProps} config={configWithStoredValues} ref={ref} />)

    // Edit an unrelated field (leave State ID untouched so "reopen" below can
    // still look the state up by id)
    fireEvent.click(screen.getByText('Interrupt Before'))

    const result = await ref.current!.save()
    expect(result).toBe(true)

    expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          data: expect.objectContaining({
            task: 'existing task',
            output_schema: '{"type":"object"}',
          }),
        }),
      })
    )

    // "Reopen" with the saved payload
    const savedState = defaultProps.onConfigChange.mock.calls[0][0].state.data
    const reopenedConfig: WorkflowConfiguration = {
      states: [{ ...savedState, custom_node_id: 'custom-1' }],
      custom_nodes: configWithStoredValues.custom_nodes,
    }
    const reopenRef = createRef<CustomTabRef>()
    vi.clearAllMocks()
    render(<CustomTab {...defaultProps} config={reopenedConfig} ref={reopenRef} />)

    const reopenResult = await reopenRef.current!.save()
    expect(reopenResult).toBe(true)
    expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          data: expect.objectContaining({
            task: 'existing task',
            output_schema: '{"type":"object"}',
          }),
        }),
      })
    )
  })
})
