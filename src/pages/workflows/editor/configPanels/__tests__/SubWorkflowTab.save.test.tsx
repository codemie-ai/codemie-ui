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

// Save/reopen preservation test for hidden Task/Output Schema values, exercised through
// the REAL CommonStateFields (SubWorkflowTab.test.tsx mocks CommonStateFields, so it
// cannot cover this).

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef, forwardRef, useEffect } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import SubWorkflowTab, { SubWorkflowTabRef } from '../SubWorkflowTab'
import {
  enableWorkflowContracts,
  fillContract,
  INPUT_CONTRACT_PLACEHOLDER,
  INPUT_SCHEMA,
  modeLabel,
  OUTPUT_CONTRACT_PLACEHOLDER,
  OUTPUT_SCHEMA,
} from './contractTestUtils'

vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    setActiveIssue: vi.fn(),
    activeIssue: null,
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

vi.mock('@/pages/workflows/components/WorkflowSelector', () => ({
  default: forwardRef(({ singleValue, value = [], onChange }: any, _ref: any) => {
    useEffect(() => {
      onChange(value)
    }, [])
    return <div data-testid="workflow-selector" data-single-value={String(singleValue)} />
  }),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getSelectableWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflowOptions: vi.fn().mockResolvedValue([]),
  },
}))

const defaultProps = {
  project: 'test-project',
  stateId: 'state-1',
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe('SubWorkflowTab — save/reopen with real CommonStateFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves stored task/output_schema through edit -> save -> reopen', async () => {
    const configWithStoredValues: WorkflowConfiguration = {
      states: [
        {
          id: 'state-1',
          workflow_id: 'wf-abc',
          task: 'existing task',
          output_schema: '{"type":"object"}',
        } as any,
      ],
    }

    const ref = createRef<SubWorkflowTabRef>()
    render(<SubWorkflowTab {...defaultProps} config={configWithStoredValues} ref={ref} />)

    // Task is genuinely hidden here, with the real component
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()

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
      states: [{ ...savedState, workflow_id: 'wf-abc' }],
    }
    const reopenRef = createRef<SubWorkflowTabRef>()
    vi.clearAllMocks()
    render(<SubWorkflowTab {...defaultProps} config={reopenedConfig} ref={reopenRef} />)

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

describe('SubWorkflowTab — contract fields', () => {
  beforeEach(() => {
    enableWorkflowContracts()
    vi.clearAllMocks()
  })

  const config: WorkflowConfiguration = {
    states: [{ id: 'state-1', workflow_id: 'wf-abc' } as any],
  }

  it('saves and reloads input_schema, output_schema and validation (AC1)', async () => {
    const user = userEvent.setup()
    const ref = createRef<SubWorkflowTabRef>()
    render(<SubWorkflowTab {...defaultProps} config={config} ref={ref} />)

    await fillContract(user, { input: INPUT_SCHEMA, output: OUTPUT_SCHEMA, mode: 'warn' })
    expect(await ref.current!.save()).toBe(true)

    const saved = defaultProps.onConfigChange.mock.calls[0][0].state.data
    expect(saved).toEqual(
      expect.objectContaining({
        input_schema: INPUT_SCHEMA,
        output_schema: OUTPUT_SCHEMA,
        save_validation: 'warn',
      })
    )

    cleanup()
    render(
      <SubWorkflowTab
        {...defaultProps}
        config={{ states: [{ ...saved, workflow_id: 'wf-abc' }] }}
      />
    )
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toHaveValue(INPUT_SCHEMA)
    expect(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).toHaveValue(OUTPUT_SCHEMA)
    expect(modeLabel()).toHaveTextContent('warn')
  })

  it('omits the validation key when the mode is unset', async () => {
    const ref = createRef<SubWorkflowTabRef>()
    render(<SubWorkflowTab {...defaultProps} config={config} ref={ref} />)

    expect(await ref.current!.save()).toBe(true)

    expect(defaultProps.onConfigChange.mock.calls[0][0].state.data.save_validation).toBeUndefined()
  })
})
