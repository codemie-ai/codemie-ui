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
import { forwardRef, useImperativeHandle, createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import AssistantTab, { AssistantTabRef } from '../AssistantTab'

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

vi.mock('../components/VirtualAssistantForm', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      validate: () => Promise.resolve(true),
      getValues: () => ({ toolkits: [], mcp_servers: [], context: [], skill_ids: [] }),
      isDirty: () => false,
      reset: vi.fn(),
      setAIGeneratedFields: vi.fn(),
    }))
    return <div data-testid="virtual-assistant-form" />
  }),
}))

vi.mock('../components/AssistantSelector', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({}))
    return <div data-testid="assistant-selector" />
  }),
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/FormGenAIPopup', () => ({
  default: () => null,
}))

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => null,
}))

const mockConfig: WorkflowConfiguration = {
  states: [
    {
      id: 'state-1',
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

describe('AssistantTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps Task and Output Schema visible', () => {
    render(<AssistantTab {...defaultProps} />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('saves typed Task and Output Schema values through onConfigChange', async () => {
    const user = userEvent.setup()
    const ref = createRef<AssistantTabRef>()
    render(<AssistantTab {...defaultProps} ref={ref} />)

    await user.type(
      screen.getByPlaceholderText('Describe the task for this node'),
      'Summarize the ticket'
    )
    fireEvent.change(screen.getByPlaceholderText('Expected output format (JSON Schema)'), {
      target: { value: '{"type":"object"}' },
    })

    const result = await ref.current!.save()

    expect(result).toBe(true)
    expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          id: 'state-1',
          data: expect.objectContaining({
            task: 'Summarize the ticket',
            output_schema: '{"type":"object"}',
          }),
        }),
      })
    )
  })
})
