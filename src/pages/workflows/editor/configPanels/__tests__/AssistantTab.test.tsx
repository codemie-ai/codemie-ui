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
import { forwardRef, useImperativeHandle, createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import AssistantTab, { AssistantTabRef } from '../AssistantTab'
import {
  enableWorkflowContracts,
  fillContract,
  INPUT_CONTRACT_PLACEHOLDER,
  INPUT_SCHEMA,
  modeLabel,
  OUTPUT_CONTRACT_PLACEHOLDER,
  OUTPUT_SCHEMA,
} from './contractTestUtils'

const { headroomFlag } = vi.hoisted(() => ({ headroomFlag: { enabled: false } }))
vi.mock('@/hooks/useFeatureFlags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useFeatureFlags')>()),
  useHeadroomEnabled: () => headroomFlag.enabled,
}))

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
    enableWorkflowContracts()
    vi.clearAllMocks()
    headroomFlag.enabled = false
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

  it('saves and reloads input_schema, output_schema and validation (AC1)', async () => {
    const user = userEvent.setup()
    const ref = createRef<AssistantTabRef>()
    render(<AssistantTab {...defaultProps} ref={ref} />)

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
    render(<AssistantTab {...defaultProps} config={{ states: [saved] }} />)
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toHaveValue(INPUT_SCHEMA)
    expect(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).toHaveValue(OUTPUT_SCHEMA)
    expect(modeLabel()).toHaveTextContent('strict')
  })

  it('omits the validation key when the mode is unset', async () => {
    const ref = createRef<AssistantTabRef>()
    render(<AssistantTab {...defaultProps} ref={ref} />)

    expect(await ref.current!.save()).toBe(true)

    const saved = defaultProps.onConfigChange.mock.calls[0][0].state.data
    expect(saved.save_validation).toBeUndefined()
    expect(modeLabel()).toHaveTextContent('Use workflow default')
  })

  describe('Headroom (context compression)', () => {
    const headroomConfig: WorkflowConfiguration = {
      states: [{ id: 'state-1', assistant_id: 'actor-1' } as any],
      assistants: [
        {
          id: 'actor-1',
          assistant_id: 'catalog-assistant',
          headroom: { enabled: true, strategy: 'lossless' },
        } as any,
      ],
    }

    const openHeadroomAccordion = async (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByText('Context compression (Headroom)'))

    it('hides the panel when the flag is off', () => {
      render(<AssistantTab {...defaultProps} />)
      expect(screen.queryByText('Context compression (Headroom)')).not.toBeInTheDocument()
    })

    it('marks the tab dirty and saves the node-level block when the flag is on', async () => {
      headroomFlag.enabled = true
      const user = userEvent.setup()
      const ref = createRef<AssistantTabRef>()
      render(<AssistantTab {...defaultProps} ref={ref} />)

      expect(ref.current!.isDirty()).toBe(false)

      await openHeadroomAccordion(user)
      await user.click(screen.getByLabelText('Enable context compression'))

      expect(ref.current!.isDirty()).toBe(true)

      const result = await ref.current!.save()

      expect(result).toBe(true)
      expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          actors: {
            assistants: [expect.objectContaining({ headroom: { enabled: true } })],
          },
        })
      )
    })

    it('shows the workflow-level block as the inherited value for the node', async () => {
      headroomFlag.enabled = true
      const user = userEvent.setup()
      render(
        <AssistantTab {...defaultProps} config={{ ...mockConfig, headroom: { enabled: true } }} />
      )

      await openHeadroomAccordion(user)

      expect(screen.getByLabelText('Enable context compression')).toBeChecked()
      expect(screen.getByLabelText('Compress tool outputs')).not.toBeDisabled()
      expect(screen.queryByText('Reset to workflow settings')).not.toBeInTheDocument()
    })

    it('keeps an existing YAML headroom block on save when the flag is off', async () => {
      const ref = createRef<AssistantTabRef>()
      render(<AssistantTab {...defaultProps} config={headroomConfig} ref={ref} />)

      const result = await ref.current!.save()

      expect(result).toBe(true)
      expect(defaultProps.onConfigChange).toHaveBeenCalledWith(
        expect.objectContaining({
          actors: {
            assistants: [
              expect.objectContaining({ headroom: { enabled: true, strategy: 'lossless' } }),
            ],
          },
        })
      )
    })
  })
})
