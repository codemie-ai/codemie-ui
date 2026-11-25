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

import { act, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ToolConfiguration } from '@/types/workflowEditor/configuration'

import ToolForm, { ToolFormRef } from '../ToolForm'

const mockGetToolSchema = vi.fn()

vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: (value: unknown) => value,
}))

vi.mock('@/store', () => ({
  assistantsStore: {
    availableToolkits: [{ toolkit: 'tk', tools: [] }],
    getAssistantToolkits: vi.fn(),
    getToolSchema: (...args: unknown[]) => mockGetToolSchema(...args),
  },
}))

vi.mock('@/store/settings', () => ({
  settingsStore: { settings: { a: 1 }, indexSettings: vi.fn() },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useWorkspaceScriptBridgeEnabled: () => [false],
}))

vi.mock('@/hooks/useToolStepConfig', () => ({ useToolStepConfig: () => undefined }))

vi.mock('@/utils/toolkit', () => ({ extractToolkitSettings: () => ({ id: undefined }) }))

vi.mock('@/utils/workflows', () => ({
  getMCPServersFromConfiguration: () => [],
  getToolkitsFromConfiguration: () => [{ toolkit: 'tk', tools: [{ name: 'exchange_read' }] }],
  normalizeToolkitSettingsForToolForm: (toolkits: unknown) => toolkits,
}))

vi.mock('../../../hooks/useWorkflowContext', async () => ({
  WorkflowContext: (await import('react')).createContext(null),
  useWorkflowContext: () => ({
    tempIssues: [],
    markIssueDirty: vi.fn(),
    selectedStateId: 'state-1',
    getIssueField: () => ({ fieldError: undefined, issue: undefined, onChange: vi.fn() }),
  }),
}))

vi.mock('../ToolSelector', () => ({ default: () => <div data-testid="tool-selector" /> }))

const renderForm = async (toolArgs: Record<string, unknown>) => {
  const ref = createRef<ToolFormRef>()
  const toolConfig = {
    id: 'state-1',
    tool: 'exchange_read',
    tool_args: toolArgs,
  } as ToolConfiguration
  render(
    <ToolForm ref={ref} project="p" toolConfig={toolConfig} showNewIntegrationPopup={vi.fn()} />
  )
  await screen.findByText(/start/i)
  return ref
}

describe('ToolForm.validate — required 0 and false values', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts a required integer set to 0', async () => {
    mockGetToolSchema.mockResolvedValue({
      args_schema: { start: { type: 'int', required: true } },
    })
    const ref = await renderForm({ start: 0 })

    let result: boolean | undefined
    await act(async () => {
      result = await ref.current!.validate()
    })

    expect(result).toBe(true)
    expect(screen.queryByText('Field is required')).not.toBeInTheDocument()
  })

  it('rejects a required integer that is missing', async () => {
    mockGetToolSchema.mockResolvedValue({
      args_schema: { start: { type: 'int', required: true } },
    })
    const ref = await renderForm({ start: undefined })

    let result: boolean | undefined
    await act(async () => {
      result = await ref.current!.validate()
    })

    expect(result).toBe(false)
    expect(screen.getByText('Field is required')).toBeInTheDocument()
  })

  it('accepts a required boolean set to false', async () => {
    mockGetToolSchema.mockResolvedValue({
      args_schema: { start: { type: 'bool', required: true } },
    })
    const ref = await renderForm({ start: false })

    let result: boolean | undefined
    await act(async () => {
      result = await ref.current!.validate()
    })

    expect(result).toBe(true)
    expect(screen.queryByText('Field is required')).not.toBeInTheDocument()
  })
})
