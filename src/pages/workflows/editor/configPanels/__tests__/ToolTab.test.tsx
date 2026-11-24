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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import ToolTab, { ToolTabRef } from '../ToolTab'
import {
  enableWorkflowContracts,
  fillContract,
  INPUT_CONTRACT_PLACEHOLDER,
  INPUT_SCHEMA,
  modeLabel,
  OUTPUT_CONTRACT_PLACEHOLDER,
  OUTPUT_SCHEMA,
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

vi.mock('../components/ToolForm', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      validate: () => Promise.resolve(true),
      getValues: () => ({
        toolkits: [],
        mcpServers: [],
        tool_args: {},
        trace: false,
        tool_result_json_pointer: '',
        resolve_dynamic_values_in_response: false,
        input_key: '',
        step_config_values: {},
      }),
      isDirty: () => false,
      reset: vi.fn(),
    }))
    return <div data-testid="tool-form" />
  }),
}))

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => null,
}))

const mockConfig: WorkflowConfiguration = {
  states: [
    {
      id: 'state-1',
      tool_id: 'tool-abc',
    } as any,
  ],
}

const defaultProps = {
  project: 'test-project',
  stateId: 'state-1',
  config: mockConfig,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe('ToolTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides Task and shows Output contract', () => {
    render(<ToolTab {...defaultProps} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('preserves stored task/output_schema through edit -> save -> reopen', async () => {
    const configWithStoredValues: WorkflowConfiguration = {
      states: [
        {
          id: 'state-1',
          tool_id: 'tool-abc',
          task: 'existing task',
          output_schema: '{"type":"object"}',
        } as any,
      ],
    }

    const ref = createRef<ToolTabRef>()
    render(<ToolTab {...defaultProps} config={configWithStoredValues} ref={ref} />)

    // Edit an unrelated field
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

    // "Reopen" with the saved payload and confirm the values are still there
    const savedState = defaultProps.onConfigChange.mock.calls[0][0].state.data
    const reopenedConfig: WorkflowConfiguration = {
      states: [{ ...savedState, tool_id: 'tool-abc' }],
    }
    const reopenRef = createRef<ToolTabRef>()
    vi.clearAllMocks()
    render(<ToolTab {...defaultProps} config={reopenedConfig} ref={reopenRef} />)

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

describe('ToolTab — contract fields', () => {
  beforeEach(() => {
    enableWorkflowContracts()
    vi.clearAllMocks()
  })

  it('saves and reloads input_schema, output_schema and validation (AC1)', async () => {
    const user = userEvent.setup()
    const ref = createRef<ToolTabRef>()
    render(<ToolTab {...defaultProps} config={mockConfig} ref={ref} />)

    await fillContract(user, { input: INPUT_SCHEMA, output: OUTPUT_SCHEMA, mode: 'strict' })
    expect(await ref.current!.save()).toBe(true)

    const saved = defaultProps.onConfigChange.mock.calls[0][0].state.data
    expect(saved).toEqual(
      expect.objectContaining({
        input_schema: INPUT_SCHEMA,
        output_schema: OUTPUT_SCHEMA,
        save_validation: 'strict',
      })
    )

    cleanup()
    render(<ToolTab {...defaultProps} config={{ states: [{ ...saved, tool_id: 'tool-abc' }] }} />)
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toHaveValue(INPUT_SCHEMA)
    expect(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).toHaveValue(OUTPUT_SCHEMA)
    expect(modeLabel()).toHaveTextContent('strict')
  })

  it('omits the validation key when the mode is unset', async () => {
    const ref = createRef<ToolTabRef>()
    render(<ToolTab {...defaultProps} config={mockConfig} ref={ref} />)

    expect(await ref.current!.save()).toBe(true)

    const saved = defaultProps.onConfigChange.mock.calls[0][0].state.data
    expect(saved.save_validation).toBeUndefined()
  })
})
