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

import { render, screen, waitFor } from '@testing-library/react'
import { createRef, forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import SubWorkflowTab, { SubWorkflowTabRef } from '../SubWorkflowTab'

vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    getIssueField: vi.fn().mockReturnValue({
      ref: { current: null },
      fieldError: undefined,
      onChange: vi.fn(),
    }),
    markIssueDirty: vi.fn(),
    issues: [],
  }),
}))

vi.mock('../CommonStateFields', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      validate: () => Promise.resolve(true),
      getValues: () => ({
        id: 'state-1',
        task: '',
        output_schema: undefined,
        interrupt_before: undefined,
        retry_policy: undefined,
        finish_iteration: undefined,
        resolve_dynamic_values_in_prompt: undefined,
        result_as_human_message: undefined,
        next: undefined,
      }),
      isDirty: () => false,
      reset: vi.fn(),
    }))
    return <div data-testid="common-state-fields" />
  }),
}))

vi.mock('@/pages/workflows/components/WorkflowSelector', () => ({
  default: forwardRef(({ singleValue }: any, _ref: any) => (
    <div data-testid="workflow-selector" data-single-value={String(singleValue)} />
  )),
}))

vi.mock('../components/TabFooter', () => ({
  default: ({ onSave, onCancel }: any) => (
    <div data-testid="tab-footer">
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

vi.mock('../components/ValidationError', () => ({
  default: ({ message }: any) =>
    message ? <div data-testid="validation-error">{message}</div> : null,
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getSelectableWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflowOptions: vi.fn().mockResolvedValue([]),
  },
}))

const mockConfig: WorkflowConfiguration = {
  states: [
    {
      id: 'state-1',
      workflow_id: 'wf-abc',
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

describe('SubWorkflowTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the workflow selector with singleValue=true', () => {
    render(<SubWorkflowTab {...defaultProps} />)
    const selector = screen.getByTestId('workflow-selector')
    expect(selector).toBeInTheDocument()
    expect(selector).toHaveAttribute('data-single-value', 'true')
  })

  it('save() calls onConfigChange with the correct state shape', async () => {
    const ref = createRef<SubWorkflowTabRef>()
    render(<SubWorkflowTab {...defaultProps} ref={ref} />)

    const result = await ref.current!.save()

    expect(result).toBe(true)
    expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          id: 'state-1',
          data: expect.objectContaining({
            workflow_id: 'wf-abc',
          }),
        }),
      })
    )
    expect(defaultProps.onConfigChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ actors: expect.anything() })
    )
  })

  it('isDirty() returns false when form and common fields are clean', () => {
    const ref = createRef<SubWorkflowTabRef>()
    render(<SubWorkflowTab {...defaultProps} ref={ref} />)
    expect(ref.current!.isDirty()).toBe(false)
  })

  it('passes getSelectableWorkflows from workflowsStore to WorkflowSelector', async () => {
    render(<SubWorkflowTab {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('workflow-selector')).toBeInTheDocument()
    })
  })
})
