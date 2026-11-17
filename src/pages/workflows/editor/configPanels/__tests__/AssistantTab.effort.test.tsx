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

import { act, render } from '@testing-library/react'
import { createRef, forwardRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import type { ConfigurationUpdate } from '@/utils/workflowEditor'

import AssistantTab, { AssistantTabRef } from '../AssistantTab'

vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

vi.mock('../../hooks/useWorkflowContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useWorkflowContext')>()
  return {
    ...actual,
    useWorkflowContext: vi.fn().mockReturnValue({
      getIssueField: vi.fn().mockReturnValue({
        ref: { current: null },
        fieldError: undefined,
        onChange: vi.fn(),
      }),
      markIssueDirty: vi.fn(),
      issues: [],
    }),
  }
})

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

vi.mock('../components/VirtualAssistantForm', () => ({
  default: forwardRef((_props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      validate: () => Promise.resolve(true),
      getValues: () => ({
        llm_model_type: 'gpt-4o',
        temperature: 0.5,
        effort: 'high',
        system_prompt: 'You are helpful',
        mcp_servers: [],
        toolkits: [],
        context: [],
        skill_ids: [],
      }),
      isDirty: () => false,
      setAIGeneratedFields: vi.fn(),
      reset: vi.fn(),
    }))
    return <div data-testid="virtual-assistant-form" />
  }),
}))

vi.mock('../components/AssistantSelector', () => ({
  default: forwardRef((_props: any, _ref: any) => <div data-testid="assistant-selector" />),
}))

vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children }: any) => <div data-testid="config-accordion">{children}</div>,
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

vi.mock('@/pages/assistants/components/AssistantForm/components/FormGenAIPopup', () => ({
  default: () => <div data-testid="form-genai-popup" />,
}))

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => <div data-testid="new-integration-popup" />,
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
  onConfigChange: vi.fn<(updates: ConfigurationUpdate) => void>(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe('AssistantTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('save() copies effort from the virtual assistant form into the persisted assistant config', async () => {
    const ref = createRef<AssistantTabRef>()
    render(<AssistantTab {...defaultProps} ref={ref} />)

    await act(async () => {
      await ref.current!.save()
    })

    expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        actors: {
          assistants: [expect.objectContaining({ effort: 'high' })],
        },
      })
    )
  })
})
