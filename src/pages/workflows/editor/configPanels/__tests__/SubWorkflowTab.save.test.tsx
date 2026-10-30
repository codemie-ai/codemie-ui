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

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef, forwardRef, useEffect } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import SubWorkflowTab, { SubWorkflowTabRef } from '../SubWorkflowTab'

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

  it('preserves stored (but hidden) task/output_schema through edit -> save -> reopen', async () => {
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

    // Confirm the fields are genuinely hidden here, with the real component
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()

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
