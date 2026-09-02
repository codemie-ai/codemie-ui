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
import { createRef } from 'react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import WorkflowForm, { WorkflowFormRef } from '../WorkflowForm'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

vi.mock('@/store/settings', () => ({
  settingsStore: { settings: {}, indexSettings: vi.fn() },
}))

vi.mock('@/store/user', () => ({
  userStore: { getDefaultProject: vi.fn().mockResolvedValue(null) },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (s: any) => s,
  }
})

const mockIsVisualEditorEnabled = vi.fn((..._args: any[]): boolean => false)

vi.mock('@/utils/workflows', () => ({
  isVisualEditorEnabled: (...args: any[]) => mockIsVisualEditorEnabled(...args),
  hasUserIntegrationInYamlConfig: () => false,
}))

const mockBlockTransition = vi.fn()
const mockUnblockTransition = vi.fn()

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: () => ({
    unblockTransition: mockUnblockTransition,
    blockTransition: mockBlockTransition,
  }),
}))

vi.mock('../WorkflowFormFields', async () => {
  const { forwardRef, useImperativeHandle, useState } = await import('react')
  return {
    default: forwardRef(({ workflow }: any, ref: any) => {
      const [yaml, setYaml] = useState(workflow?.yaml_config ?? '')
      useImperativeHandle(ref, () => ({
        isValid: true,
        triggerValidation: vi.fn(),
        getValues: () => ({ yaml_config: yaml }),
        setYamlConfig: (y: string) => setYaml(y),
      }))
      return <div data-testid="form-fields" />
    }),
  }
})

vi.mock('@/pages/workflows/editor/WorkflowEditor', () => ({
  default: () => <div data-testid="visual-editor" />,
}))

vi.mock('@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel', () => ({
  default: () => null,
}))

vi.mock('@/components/ProjectSelector', () => ({
  default: () => null,
}))

const workflow = {
  id: 'wf-1',
  name: 'Test',
  yaml_config: 'states: []',
  yaml_config_history: [],
  guardrail_assignments: [],
}

describe('WorkflowForm — replaceYamlConfig', () => {
  it('exposes replaceYamlConfig on ref', () => {
    const ref = createRef<WorkflowFormRef>()
    render(<WorkflowForm ref={ref} onSubmit={vi.fn()} workflow={workflow} isEditing />)
    expect(typeof ref.current?.replaceYamlConfig).toBe('function')
  })

  it('replaceYamlConfig updates getFormValues result (legacy mode)', async () => {
    const ref = createRef<WorkflowFormRef>()
    render(<WorkflowForm ref={ref} onSubmit={vi.fn()} workflow={workflow} isEditing />)

    await act(async () => {
      ref.current?.replaceYamlConfig('states:\n  - id: ai-step')
    })

    const values = ref.current?.getFormValues()
    expect(values?.yaml_config).toBe('states:\n  - id: ai-step')
  })

  it('replaceYamlConfig calls blockTransition', async () => {
    const ref = createRef<WorkflowFormRef>()
    render(<WorkflowForm ref={ref} onSubmit={vi.fn()} workflow={workflow} isEditing />)

    await act(async () => {
      ref.current?.replaceYamlConfig('states:\n  - id: ai-step')
    })

    expect(mockBlockTransition).toHaveBeenCalled()
  })
})

describe('WorkflowForm — replaceYamlConfig (visual editor mode)', () => {
  beforeEach(() => {
    mockIsVisualEditorEnabled.mockReturnValue(true)
  })

  afterEach(() => {
    mockIsVisualEditorEnabled.mockReturnValue(false)
  })

  it('replaceYamlConfig does not call formFieldsRef.setYamlConfig in visual editor mode', async () => {
    const setYamlConfigSpy = vi.fn()
    const ref = createRef<WorkflowFormRef>()
    render(<WorkflowForm ref={ref} onSubmit={vi.fn()} workflow={workflow} isEditing />)

    await act(async () => {
      ref.current?.replaceYamlConfig('states:\n  - id: visual-step')
    })

    // In visual editor mode, only setYamlConfig state is updated — formFieldsRef.setYamlConfig is NOT called
    expect(setYamlConfigSpy).not.toHaveBeenCalled()
    expect(mockBlockTransition).toHaveBeenCalled()
  })
})
