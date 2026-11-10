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

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowFormFields, { WorkflowFormFieldsRef } from '../WorkflowFormFields'

vi.hoisted(() => vi.resetModules())

const { mockSettingsStore } = vi.hoisted(() => ({
  mockSettingsStore: {
    settings: {} as Record<string, any[]>,
    indexSettings: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn((store) => {
      if (store === mockSettingsStore) return mockSettingsStore
      return store
    }),
  }
})

vi.mock('@/store/settings', () => ({
  settingsStore: mockSettingsStore,
}))

const mockHasUserIntegrationInYamlConfig = vi.fn()

vi.mock('@/utils/workflows', () => ({
  hasUserIntegrationInYamlConfig: (...args: any[]) => mockHasUserIntegrationInYamlConfig(...args),
}))

vi.mock('@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel', () => ({
  default: () => <div data-testid="guardrail-panel" />,
}))

vi.mock('@/components/ProjectSelector', () => ({
  default: ({ onChange }: any) => (
    <div data-testid="project-selector">
      <button onClick={() => onChange('project-1')}>Select project</button>
    </div>
  ),
}))

vi.mock('../WorkflowConfigField', () => ({
  default: ({ value }: any) => <div data-testid="workflow-config-field">{value}</div>,
}))

vi.mock('@/components/ZoomableImage', () => ({
  default: ({ children }: any) => <div data-testid="zoomable-image">{children}</div>,
}))

vi.mock('@/components/Spinner', () => ({
  default: () => <div data-testid="spinner" />,
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
}))

const { mockGetWorkflowDiagram } = vi.hoisted(() => ({
  mockGetWorkflowDiagram: vi.fn(),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowDiagram: mockGetWorkflowDiagram,
  },
}))

const mockUseMermaidEnabled = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/useFeatureFlags', () => ({
  useMermaidEnabled: mockUseMermaidEnabled,
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/MarketplaceCategories', () => ({
  default: () => <div data-testid="marketplace-categories" />,
}))

const YAML_WITH_USER_INTEGRATION = `
assistants:
  - name: my_assistant
    tools:
      - name: jira_tool
        integration_alias: user_jira_alias
`

const YAML_WITHOUT_USER_INTEGRATION = `
assistants:
  - name: my_assistant
    tools:
      - name: jira_tool
`

/**
 * Settings fixture that contains a "user"-type setting matching
 * the alias used in YAML_WITH_USER_INTEGRATION.
 */
const settingsWithUserType: Record<string, any[]> = {
  jira: [
    {
      alias: 'user_jira_alias',
      setting_type: 'user',
      credential_type: 'jira',
    },
  ],
}

const renderWorkflowFormFields = (props: Record<string, any> = {}) =>
  render(<WorkflowFormFields {...props} />)

// Default every existing test to the available path — Mermaid gating tests
// below override this per-case. clearAllMocks() in nested beforeEach hooks
// only resets call history, not this implementation.
beforeEach(() => {
  mockUseMermaidEnabled.mockReturnValue([true, true])
})

describe('WorkflowFormFields — Share with Project disable behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettingsStore.settings = {}
    mockSettingsStore.indexSettings.mockResolvedValue({})
  })

  describe('when hasUserIntegrationInYamlConfig returns true', () => {
    beforeEach(() => {
      mockHasUserIntegrationInYamlConfig.mockReturnValue(true)
      mockSettingsStore.settings = settingsWithUserType
    })

    it('disables the "Shared with Project Team" switch', () => {
      renderWorkflowFormFields({
        workflow: { yaml_config: YAML_WITH_USER_INTEGRATION, shared: true },
      })

      const switchInput = screen.getByRole('switch')
      expect(switchInput).toBeDisabled()
    })

    it('shows the user-integration InfoBox message', () => {
      renderWorkflowFormFields({
        workflow: { yaml_config: YAML_WITH_USER_INTEGRATION },
      })

      expect(
        screen.getByText(
          'Sharing is disabled because this workflow contains User-integration configuration.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('when hasUserIntegrationInYamlConfig returns false', () => {
    beforeEach(() => {
      mockHasUserIntegrationInYamlConfig.mockReturnValue(false)
      mockSettingsStore.settings = {}
    })

    it('keeps the "Shared with Project Team" switch enabled', () => {
      renderWorkflowFormFields({
        workflow: { yaml_config: YAML_WITHOUT_USER_INTEGRATION },
      })

      const switchInput = screen.getByRole('switch')
      expect(switchInput).not.toBeDisabled()
    })

    it('does not show the user-integration InfoBox', () => {
      renderWorkflowFormFields({
        workflow: { yaml_config: YAML_WITHOUT_USER_INTEGRATION },
      })

      expect(
        screen.queryByText(
          'Sharing is disabled because this workflow contains User-integration configuration.'
        )
      ).not.toBeInTheDocument()
    })
  })

  describe('useEffect: resets "shared" to false when user-integration is detected', () => {
    it('resets the shared value to false when user-integration is present', async () => {
      mockHasUserIntegrationInYamlConfig.mockReturnValue(true)
      mockSettingsStore.settings = settingsWithUserType

      renderWorkflowFormFields({
        workflow: { yaml_config: YAML_WITH_USER_INTEGRATION, shared: true },
      })

      await waitFor(() => {
        const switchInput = screen.getByRole('switch') as HTMLInputElement
        expect(switchInput.checked).toBe(false)
        expect(switchInput).toBeDisabled()
      })
    })
  })
})

describe('WorkflowFormFields — categories field', () => {
  beforeEach(() => {
    mockHasUserIntegrationInYamlConfig.mockReturnValue(false)
  })

  it('renders MarketplaceCategories field', () => {
    renderWorkflowFormFields({ workflow: {} })
    expect(screen.getByTestId('marketplace-categories')).toBeInTheDocument()
  })

  it('getValues includes categories from workflow prop', async () => {
    const ref = createRef<WorkflowFormFieldsRef>()
    render(<WorkflowFormFields ref={ref} workflow={{ categories: ['cat-1'] }} />)
    await waitFor(() => {
      const values = ref.current?.getValues()
      expect(values?.categories).toEqual(['cat-1'])
    })
  })
})

describe('WorkflowFormFields — setYamlConfig ref method', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettingsStore.settings = {}
    mockHasUserIntegrationInYamlConfig.mockReturnValue(false)
  })

  it('exposes setYamlConfig on ref', () => {
    const ref = createRef<WorkflowFormFieldsRef>()
    render(
      <WorkflowFormFields
        ref={ref}
        workflow={{ yaml_config: 'states: []', yaml_config_history: [] }}
        isEditing
      />
    )
    expect(typeof ref.current?.setYamlConfig).toBe('function')
  })

  it('setYamlConfig updates yaml_config value in form', async () => {
    const ref = createRef<WorkflowFormFieldsRef>()
    render(
      <WorkflowFormFields
        ref={ref}
        workflow={{ yaml_config: 'states: []', yaml_config_history: [] }}
        isEditing
      />
    )

    await act(async () => {
      ref.current?.setYamlConfig('states:\n  - id: ai-step')
    })

    const values = ref.current?.getValues()
    expect(values?.yaml_config).toBe('states:\n  - id: ai-step')
  })
})

describe('WorkflowFormFields — Mermaid availability gating', () => {
  beforeEach(() => {
    mockHasUserIntegrationInYamlConfig.mockReturnValue(false)
    mockGetWorkflowDiagram.mockReset()
  })

  describe('when Mermaid is unavailable', () => {
    beforeEach(() => {
      mockUseMermaidEnabled.mockReturnValue([false, true])
    })

    it('disables the Visualize button', () => {
      renderWorkflowFormFields({ workflow: {} })

      const visualizeButton = screen.getByRole('button', { name: /visualize/i })
      expect(visualizeButton).toBeDisabled()
    })

    it('shows a "not configured" hint', () => {
      renderWorkflowFormFields({ workflow: {} })

      expect(screen.getByText(/not configured/i)).toBeInTheDocument()
    })

    it('never calls getWorkflowDiagram after clicking Visualize', () => {
      renderWorkflowFormFields({ workflow: {} })

      const visualizeButton = screen.getByRole('button', { name: /visualize/i })
      fireEvent.click(visualizeButton)

      expect(mockGetWorkflowDiagram).not.toHaveBeenCalled()
    })
  })

  describe('when Mermaid is available', () => {
    beforeEach(() => {
      mockUseMermaidEnabled.mockReturnValue([true, true])
      mockGetWorkflowDiagram.mockResolvedValue({
        json: () => Promise.resolve({ data: 'data:image/png;base64,abc' }),
      })
    })

    it('keeps the Visualize button enabled', () => {
      renderWorkflowFormFields({ workflow: {} })

      const visualizeButton = screen.getByRole('button', { name: /visualize/i })
      expect(visualizeButton).not.toBeDisabled()
    })

    it('does not show the "not configured" hint', () => {
      renderWorkflowFormFields({ workflow: {} })

      expect(screen.queryByText(/not configured/i)).not.toBeInTheDocument()
    })

    it('calls getWorkflowDiagram when Visualize is clicked (regression)', async () => {
      renderWorkflowFormFields({ workflow: {} })

      const visualizeButton = screen.getByRole('button', { name: /visualize/i })

      await act(async () => {
        fireEvent.click(visualizeButton)
      })

      expect(mockGetWorkflowDiagram).toHaveBeenCalled()
    })

    it('discards a diagram that resolves after Mermaid flips to unavailable mid-flight (regression)', async () => {
      let resolveDiagram: (value: any) => void = () => {}
      mockGetWorkflowDiagram.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDiagram = resolve
          })
      )

      const { rerender } = renderWorkflowFormFields({ workflow: {} })

      const visualizeButton = screen.getByRole('button', { name: /visualize/i })
      fireEvent.click(visualizeButton)

      // Flip the flag while the request is still in flight.
      mockUseMermaidEnabled.mockReturnValue([false, true])
      rerender(<WorkflowFormFields workflow={{}} />)

      await act(async () => {
        resolveDiagram({ json: () => Promise.resolve({ data: 'data:image/png;base64,abc' }) })
      })

      expect(screen.queryByAltText('Workflow Diagram')).not.toBeInTheDocument()
      expect(screen.getByText(/not configured/i)).toBeInTheDocument()
    })
  })
})
