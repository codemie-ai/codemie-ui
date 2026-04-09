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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import WorkflowFormFields from '../WorkflowFormFields'

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

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowDiagram: vi.fn(),
  },
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
