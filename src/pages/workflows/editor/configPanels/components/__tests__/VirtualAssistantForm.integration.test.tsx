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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { EffortLevel } from '@/types/entity/assistant'
import { ModelOption } from '@/types/entity/configuration'
import { NodeTypes } from '@/types/workflowEditor/base'

import { isFieldSupported } from '../../../utils/visualEditorFieldRegistry'
import VirtualAssistantForm, { VirtualAssistantFormRef } from '../VirtualAssistantForm'

// Renders the real component (unlike AssistantTab.test.tsx and ConfigPanel.test.tsx, which
// both mock it out entirely) so the capability-gated visibility and the model-change
// clearing effect added to this file get exercised by at least one test.

vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

vi.mock('@/pages/workflows/editor/hooks/useWorkflowContext', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/pages/workflows/editor/hooks/useWorkflowContext')
  >()
  return {
    ...actual,
    useWorkflowContext: vi.fn().mockReturnValue({ activeIssue: null }),
  }
})

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: vi.fn().mockReturnValue([false, true]),
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/LLMSelector', () => ({
  default: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
    <select
      data-testid="llm-selector-stub"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">none</option>
      <option value="model-a">model-a</option>
      <option value="model-b">model-b</option>
      <option value="claude-model">claude-model</option>
      <option value="no-temp-model">no-temp-model</option>
      <option value="temp-model">temp-model</option>
    </select>
  ),
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/ContextSelector', () => ({
  default: () => <div data-testid="context-selector-stub" />,
}))

vi.mock(
  '@/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration',
  () => ({
    default: () => <div data-testid="tools-configuration-stub" />,
  })
)

vi.mock(
  '@/pages/assistants/components/AssistantForm/components/SystemPrompt/SystemPromptGenAIPopup',
  () => ({
    default: () => null,
  })
)

const model = (over: Partial<ModelOption>): ModelOption => ({
  value: 'model-value',
  label: 'Model Label',
  isDefault: false,
  ...over,
})

const baseProps = {
  project: '',
  isGlobal: true,
  showNewIntegrationPopup: vi.fn(),
}

describe('VirtualAssistantForm', () => {
  beforeEach(() => {
    appInfoStore.llmModels = []
  })

  it('hides Temperature when the selected model does not support it', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'no-temp-model',
        temperatureSupported: false,
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
      }),
    ]

    render(
      <VirtualAssistantForm
        {...baseProps}
        assistantConfig={{ id: 'state-1', model: 'no-temp-model', system_prompt: 'hi' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Effort' })).toBeInTheDocument()
    })
    expect(screen.queryByTestId('virtual-assistant-temperature-input')).not.toBeInTheDocument()
  })

  it('shows Temperature when the selected model supports it', async () => {
    appInfoStore.llmModels = [model({ value: 'temp-model', temperatureSupported: true })]

    render(
      <VirtualAssistantForm
        {...baseProps}
        assistantConfig={{ id: 'state-1', model: 'temp-model', system_prompt: 'hi' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('virtual-assistant-temperature-input')).toBeInTheDocument()
    })
  })

  it('does not clear a saved effort on initial mount while appInfoStore.llmModels is still loading', async () => {
    appInfoStore.llmModels = []
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{
          id: 'state-1',
          model: 'claude-model',
          system_prompt: 'hi',
          effort: EffortLevel.HIGH,
        }}
      />
    )

    expect(ref.current?.getValues().effort).toBe('high')
    expect(screen.queryByRole('button', { name: 'Effort' })).not.toBeInTheDocument()

    // The store finishes loading after this component has already mounted with a
    // legitimately-saved `effort`. The capability flags must pick this up reactively
    // (CR-002), and the clearing effect must not wipe the saved value on this, its first
    // run, since `previousModelRef` has nothing to compare against yet (CR-003's guard).
    act(() => {
      appInfoStore.llmModels = [
        model({
          value: 'claude-model',
          effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
          temperatureSupported: true,
        }),
      ]
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Effort' })).toBeInTheDocument()
    })
    expect(ref.current?.getValues().effort).toBe('high')
  })

  it('clears a stale effort and temperature when switching to a model that supports neither', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
        temperatureSupported: true,
      }),
      model({ value: 'model-b', temperatureSupported: false }),
    ]
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{
          id: 'state-1',
          model: 'model-a',
          system_prompt: 'hi',
          effort: EffortLevel.HIGH,
          temperature: 0.7,
        }}
      />
    )

    await waitFor(() => {
      expect(ref.current?.getValues().effort).toBe('high')
    })

    fireEvent.change(screen.getByTestId('llm-selector-stub'), { target: { value: 'model-b' } })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Effort' })).not.toBeInTheDocument()
      expect(screen.queryByTestId('virtual-assistant-temperature-input')).not.toBeInTheDocument()
    })
    expect(ref.current?.getValues().effort).toBeUndefined()
    expect(ref.current?.getValues().temperature).toBeUndefined()
  })

  it('shows Effort only for an effort-capable model with no saved temperature', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
        temperatureSupported: true,
      }),
    ]

    render(
      <VirtualAssistantForm
        {...baseProps}
        assistantConfig={{ id: 'state-1', model: 'model-a', system_prompt: 'hi' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Effort' })).toBeInTheDocument()
    })
    expect(screen.queryByTestId('virtual-assistant-temperature-input')).not.toBeInTheDocument()
  })

  it('keeps a saved temperature visible on an effort-capable model until an effort is selected', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
        temperatureSupported: true,
      }),
    ]
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{ id: 'state-1', model: 'model-a', system_prompt: 'hi', temperature: 0.7 }}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('virtual-assistant-temperature-input')).toBeInTheDocument()
    })
    expect(ref.current?.getValues().temperature).toBe(0.7)

    await userEvent.click(screen.getByRole('button', { name: 'Effort' }))
    await userEvent.click(await screen.findByText('high'))

    await waitFor(() => {
      expect(screen.queryByTestId('virtual-assistant-temperature-input')).not.toBeInTheDocument()
    })
    expect(ref.current?.getValues().effort).toBe('high')
    expect(ref.current?.getValues().temperature).toBeUndefined()
  })

  it('resets effort and temperature on model change and shows the new model fields', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
        temperatureSupported: true,
      }),
      model({ value: 'model-b', temperatureSupported: true }),
    ]
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{
          id: 'state-1',
          model: 'model-a',
          system_prompt: 'hi',
          effort: EffortLevel.HIGH,
          temperature: 0.7,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Effort' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId('llm-selector-stub'), { target: { value: 'model-b' } })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Effort' })).not.toBeInTheDocument()
      expect(screen.getByTestId('virtual-assistant-temperature-input')).toBeInTheDocument()
    })
    expect(ref.current?.getValues().effort).toBeUndefined()
    expect(ref.current?.getValues().temperature).toBeUndefined()
  })

  it('keeps saved params when a model is filled in where none was set', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH],
        temperatureSupported: true,
      }),
    ]
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{
          id: 'state-1',
          system_prompt: 'hi',
          effort: EffortLevel.HIGH,
          temperature: 0.7,
        }}
      />
    )

    fireEvent.change(screen.getByTestId('llm-selector-stub'), { target: { value: 'model-a' } })

    await waitFor(() => {
      expect(ref.current?.getValues().llm_model_type).toBe('model-a')
    })
    expect(ref.current?.getValues().effort).toBe('high')
    expect(ref.current?.getValues().temperature).toBe(0.7)
  })

  it('registers effort as a supported assistant node field', () => {
    expect(isFieldSupported('effort', NodeTypes.ASSISTANT)).toBe(true)
  })

  it('shows the token-usage warning on xhigh but not on high', async () => {
    appInfoStore.llmModels = [
      model({
        value: 'model-a',
        effortLevels: [EffortLevel.LOW, EffortLevel.HIGH, EffortLevel.XHIGH],
        temperatureSupported: true,
      }),
    ]
    const warning =
      'Higher effort increases model thinking and may significantly increase token usage.'

    render(
      <VirtualAssistantForm
        {...baseProps}
        assistantConfig={{
          id: 'state-1',
          model: 'model-a',
          system_prompt: 'hi',
          effort: EffortLevel.LOW,
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Effort' })).toBeInTheDocument()
    })
    expect(screen.queryByText(warning)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Effort' }))
    await userEvent.click(await screen.findByText('high'))
    expect(screen.queryByText(warning)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Effort' }))
    await userEvent.click(await screen.findByText('xhigh'))

    expect(await screen.findByText(warning)).toBeInTheDocument()
  })

  it('marks the form dirty when the model changes', async () => {
    appInfoStore.llmModels = [
      model({ value: 'model-a', temperatureSupported: true }),
      model({ value: 'model-b', temperatureSupported: true }),
    ]
    const ref = createRef<VirtualAssistantFormRef>()

    render(
      <VirtualAssistantForm
        {...baseProps}
        ref={ref}
        assistantConfig={{ id: 'state-1', model: 'model-a', system_prompt: 'hi' }}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('virtual-assistant-temperature-input')).toBeInTheDocument()
    })
    expect(ref.current?.isDirty()).toBe(false)

    fireEvent.change(screen.getByTestId('llm-selector-stub'), { target: { value: 'model-b' } })

    await waitFor(() => {
      expect(ref.current?.isDirty()).toBe(true)
    })
  })
})
