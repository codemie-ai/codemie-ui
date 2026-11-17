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
import { forwardRef, createRef, useImperativeHandle } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import AssistantTab, { AssistantTabRef } from '../AssistantTab'

// --- Mocks ---

const { mockWorkflowContextValue, mockVirtualAssistantValues } = vi.hoisted(() => ({
  mockWorkflowContextValue: {
    activeIssue: null,
    issues: [],
    markIssueDirty: vi.fn(),
    getIssueField: vi.fn().mockReturnValue({ ref: { current: null }, onChange: vi.fn() }),
  },
  mockVirtualAssistantValues: {
    system_prompt: 'prompt',
    llm_model_type: 'gpt-4',
    temperature: undefined as number | undefined,
    toolkits: [],
    mcp_servers: [],
    context: [] as { id: string }[],
    skill_ids: [] as string[],
    disabled_context_tools: ['search_code_repo'],
  },
}))

vi.mock('../../hooks/useWorkflowContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useWorkflowContext')>()
  return {
    ...actual,
    useWorkflowContext: vi.fn().mockReturnValue(mockWorkflowContextValue),
  }
})

vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../CommonStateFields', () => ({
  default: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({
      getValues: () => ({ id: 'assistant_1' }),
      validate: async () => true,
      isDirty: () => false,
      reset: () => {},
    }))
    return <div data-testid="common-state-fields" />
  }),
}))

vi.mock('../components/AssistantSelector', () => ({
  default: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({}))
    return <div data-testid="assistant-selector" />
  }),
}))

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: () => null,
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/FormGenAIPopup', () => ({
  default: () => null,
}))

vi.mock('../components/VirtualAssistantForm', () => ({
  default: forwardRef((_props: unknown, ref) => {
    useImperativeHandle(ref, () => ({
      getValues: () => mockVirtualAssistantValues,
      validate: async () => true,
      setAIGeneratedFields: () => {},
      isDirty: () => false,
      reset: () => {},
    }))
    return <div data-testid="virtual-assistant-form" />
  }),
}))

// --- Fixtures ---

const baseConfig: WorkflowConfiguration = {
  states: [{ id: 'assistant_1' }],
  assistants: [],
}

const defaultProps = {
  project: 'proj-1',
  stateId: 'assistant_1',
  config: baseConfig,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

// --- Tests ---

describe('AssistantTab — virtual assistant disabled_context_tools save path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVirtualAssistantValues.disabled_context_tools = ['search_code_repo']
  })

  it('carries VirtualAssistantForm.disabled_context_tools onto the saved assistant config', async () => {
    const onConfigChange = vi.fn()
    const ref = createRef<AssistantTabRef>()

    render(<AssistantTab {...defaultProps} onConfigChange={onConfigChange} ref={ref} />)

    const success = await ref.current!.save()

    expect(success).toBe(true)
    expect(onConfigChange).toHaveBeenCalledTimes(1)
    const savedAssistant = onConfigChange.mock.calls[0][0].actors.assistants[0]
    expect(savedAssistant.disabled_context_tools).toEqual(['search_code_repo'])
  })

  it('defaults to an empty array when VirtualAssistantForm reports none deselected', async () => {
    mockVirtualAssistantValues.disabled_context_tools = []
    const onConfigChange = vi.fn()
    const ref = createRef<AssistantTabRef>()

    render(<AssistantTab {...defaultProps} onConfigChange={onConfigChange} ref={ref} />)

    await ref.current!.save()

    const savedAssistant = onConfigChange.mock.calls[0][0].actors.assistants[0]
    expect(savedAssistant.disabled_context_tools).toEqual([])
  })
})
