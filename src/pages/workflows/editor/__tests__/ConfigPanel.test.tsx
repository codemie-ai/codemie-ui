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

import { render, act } from '@testing-library/react'
import React, { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'

import ConfigPanel, { ConfigPanelRef } from '../ConfigPanel'
import { TAB_DATA } from '../constants'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock child components to keep test isolated and fast
vi.mock('../configPanels/GeneralConfigTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => mockGeneralConfigDirty,
      save: mockGeneralConfigSave,
      validate: mockGeneralConfigValidate,
      getValues: () => mockGeneralConfigValues,
    }))
    return <div data-testid="general-config-tab">GeneralConfigTab</div>
  }),
}))

vi.mock('../configPanels/AdvancedConfigTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => mockAdvancedConfigDirty,
      save: mockAdvancedConfigSave,
    }))
    return <div data-testid="advanced-config-tab">AdvancedConfigTab</div>
  }),
}))

vi.mock('../configPanels/AssistantTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => mockNodeTabDirty,
      save: mockNodeTabSave,
    }))
    return <div data-testid="assistant-tab">AssistantTab</div>
  }),
}))

vi.mock('../configPanels/CustomTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="custom-tab">CustomTab</div>
  }),
}))

vi.mock('../configPanels/ToolTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="tool-tab">ToolTab</div>
  }),
}))

vi.mock('../configPanels/TransformTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="transform-tab">TransformTab</div>
  }),
}))

vi.mock('../configPanels/ConditionalTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="conditional-tab">ConditionalTab</div>
  }),
}))

vi.mock('../configPanels/SwitchTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="switch-tab">SwitchTab</div>
  }),
}))

vi.mock('../configPanels/IteratorTab', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => false,
      save: vi.fn().mockResolvedValue(true),
    }))
    return <div data-testid="iterator-tab">IteratorTab</div>
  }),
}))

vi.mock('../configPanels/ConnectionTab', () => ({
  default: (_props: any) => <div data-testid="connection-tab">ConnectionTab</div>,
}))

vi.mock('../configPanels/YamlPanel', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      isDirty: () => mockYamlDirty,
      save: mockYamlSave,
    }))
    return <div data-testid="yaml-panel">YamlPanel</div>
  }),
}))

vi.mock('../configPanels/UnsavedChangesConfirmation', () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="unsaved-changes-dialog">Unsaved Changes</div> : null,
}))

vi.mock('../IssuesPanel', () => ({
  default: () => <div data-testid="issues-panel">IssuesPanel</div>,
}))

vi.mock('@/components/Tabs/Tabs', () => ({
  default: ({ tabs, activeTab }: any) => {
    const active = tabs.find((t: any) => t.id === activeTab)
    return <div data-testid="tabs">{active?.element}</div>
  },
}))

// ─── Mock state variables ─────────────────────────────────────────────────────

let mockGeneralConfigDirty = false
const mockGeneralConfigSave = vi.fn().mockResolvedValue(true)
const mockGeneralConfigValidate = vi.fn().mockResolvedValue(true)
let mockGeneralConfigValues: any = {
  name: 'Test Workflow',
  project: 'test-project',
  description: 'A test workflow',
  start_hint: 'Start here',
  icon_url: '',
  shared: false,
  guardrail_assignments: [],
}

let mockAdvancedConfigDirty = false
const mockAdvancedConfigSave = vi.fn().mockResolvedValue(true)

let mockNodeTabDirty = false
const mockNodeTabSave = vi.fn().mockResolvedValue(true)

let mockYamlDirty = false
const mockYamlSave = vi.fn().mockResolvedValue(true)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultWorkflowContextValue = {
  selectedStateId: null,
  issues: null,
  activeIssue: null,
  setActiveIssue: vi.fn(),
  getIssueField: vi.fn(),
  getToolIssue: vi.fn(),
  getMcpIssue: vi.fn(),
  goToField: vi.fn(),
  isIssueResolved: vi.fn(),
  isIssueDirty: vi.fn(),
  markIssueDirty: vi.fn(),
  clearAllDirtyIssues: vi.fn(),
  clearAllDirtyMcpIssues: vi.fn(),
  resolveAllDirtyIssues: vi.fn(),
  removeArrayIssue: vi.fn(),
  tempIssues: null,
  setIssues: vi.fn(),
  setTempIssues: vi.fn(),
}

const defaultProps = {
  config: { states: [], assistants: [], tools: [], custom_nodes: [] },
  visibleTabs: [TAB_DATA.CONFIGURATION.ID] as any[],
  activeTab: TAB_DATA.CONFIGURATION.ID as any,
  toggleTabs: vi.fn(),
  onActiveTabChange: vi.fn(),
  selectedNode: null,
  selectedEdge: null,
  showIssuesPanel: false,
  onUpdateConfig: vi.fn(),
  onUpdateAdvancedConfig: vi.fn(),
  onUpdateWorkflow: vi.fn(),
  onUpdateYaml: vi.fn(),
  onDeleteNode: vi.fn(),
  onDuplicateNode: vi.fn(),
  onDeleteConnection: vi.fn(),
  onClose: vi.fn(),
  yamlConfig: '',
  workflow: {
    name: 'Test Workflow',
    project: 'test-project',
    description: 'A test workflow',
    start_hint: 'Start here',
    icon_url: '',
    shared: false,
    guardrail_assignments: [],
  },
}

const renderConfigPanel = (
  ref: React.RefObject<ConfigPanelRef | null>,
  propsOverride: Partial<typeof defaultProps> = {}
) => {
  const props = { ...defaultProps, ...propsOverride }

  return render(
    <UnsavedChangesProvider>
      <WorkflowContext.Provider value={defaultWorkflowContextValue}>
        <ConfigPanel ref={ref} {...props} />
      </WorkflowContext.Provider>
    </UnsavedChangesProvider>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConfigPanel — useImperativeHandle (unstashed changes)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGeneralConfigDirty = false
    mockAdvancedConfigDirty = false
    mockNodeTabDirty = false
    mockYamlDirty = false
    mockGeneralConfigSave.mockResolvedValue(true)
    mockAdvancedConfigSave.mockResolvedValue(true)
    mockNodeTabSave.mockResolvedValue(true)
    mockYamlSave.mockResolvedValue(true)
    mockGeneralConfigValues = {
      name: 'Test Workflow',
      project: 'test-project',
      description: 'A test workflow',
      start_hint: 'Start here',
      icon_url: '',
      shared: false,
      guardrail_assignments: [],
    }
  })

  describe('isDirty', () => {
    it('returns false when active tab is not dirty', () => {
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(ref)

      expect(ref.current?.isDirty()).toBe(false)
    })

    it('returns true when active tab (Configuration) is dirty', () => {
      mockGeneralConfigDirty = true
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(ref)

      expect(ref.current?.isDirty()).toBe(true)
    })

    it('returns true when active tab (YAML) is dirty', () => {
      mockYamlDirty = true
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          visibleTabs: [TAB_DATA.YAML.ID],
          activeTab: TAB_DATA.YAML.ID,
          yamlConfig: 'states: []',
        }
      )

      expect(ref.current?.isDirty()).toBe(true)
    })
  })

  describe('showUnsavedChangesDialog', () => {
    it('shows the unsaved changes confirmation dialog', () => {
      const ref = createRef<ConfigPanelRef>()
      const { queryByTestId } = renderConfigPanel(ref)

      expect(queryByTestId('unsaved-changes-dialog')).toBeNull()

      act(() => {
        ref.current?.showUnsavedChangesDialog()
      })

      expect(queryByTestId('unsaved-changes-dialog')).toBeInTheDocument()
    })
  })

  describe('save — unstashed changes flushing', () => {
    it('calls save on the active tab when on Configuration tab', async () => {
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.CONFIGURATION.ID,
          visibleTabs: [TAB_DATA.CONFIGURATION.ID],
        }
      )

      let result: boolean | null = null
      await act(async () => {
        result = await ref.current!.save()
      })

      expect(mockGeneralConfigSave).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('flushes generalConfigTab first when active tab is NOT Configuration and general config is dirty', async () => {
      // Scenario: User is on YAML tab, but GeneralConfigTab has unsaved (unstashed) changes.
      // The save() method should flush generalConfigTab first, then save the active (YAML) tab.
      mockGeneralConfigDirty = true
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.YAML.ID,
          visibleTabs: [TAB_DATA.YAML.ID],
          yamlConfig: 'states: []',
        }
      )

      let result: boolean | null = null
      await act(async () => {
        result = await ref.current!.save()
      })

      // generalConfigTabRef.save() should have been called to flush unstashed changes
      expect(mockGeneralConfigSave).toHaveBeenCalledTimes(1)
      // Then the active tab (YAML) save should also be called
      expect(mockYamlSave).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('does NOT flush generalConfigTab when active tab is NOT Configuration but general config is clean', async () => {
      // Scenario: User is on YAML tab, GeneralConfigTab has NO unsaved changes.
      // The save() method should NOT flush generalConfigTab, only the active tab.
      mockGeneralConfigDirty = false
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.YAML.ID,
          visibleTabs: [TAB_DATA.YAML.ID],
          yamlConfig: 'states: []',
        }
      )

      let result: boolean | null = null
      await act(async () => {
        result = await ref.current!.save()
      })

      // generalConfigTabRef.save() should NOT be called because it's not dirty
      expect(mockGeneralConfigSave).not.toHaveBeenCalled()
      // Only the active (YAML) tab save should be called
      expect(mockYamlSave).toHaveBeenCalledTimes(1)
      expect(result).toBe(true)
    })

    it('flushes generalConfigTab when active tab is Advanced and general config has unsaved changes', async () => {
      mockGeneralConfigDirty = true
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.ADVANCED.ID,
          visibleTabs: [TAB_DATA.CONFIGURATION.ID],
        }
      )

      await act(async () => {
        await ref.current!.save()
      })

      // Should flush the generalConfigTab's unstashed changes
      expect(mockGeneralConfigSave).toHaveBeenCalledTimes(1)
    })

    it('returns null when activeTabRef.save() is not available', async () => {
      // If no tab is rendered (no active tab element), save should return null
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.ISSUES.ID,
          visibleTabs: [TAB_DATA.ISSUES.ID],
          showIssuesPanel: true,
        }
      )

      let result: boolean | null = null
      await act(async () => {
        result = await ref.current!.save()
      })

      // IssuesPanel doesn't expose a save method via ref, so result should be null
      expect(result).toBe(null)
    })
  })

  describe('getWorkflowFields', () => {
    it('returns values from generalConfigTabRef when on Configuration tab', () => {
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.CONFIGURATION.ID,
          visibleTabs: [TAB_DATA.CONFIGURATION.ID],
        }
      )

      const fields = ref.current?.getWorkflowFields()

      expect(fields).toEqual(mockGeneralConfigValues)
    })

    it('returns values from generalConfigTabRef even when on a different tab', () => {
      // The dedicated generalConfigTabRef should persist values regardless of
      // which tab is currently active.
      mockGeneralConfigValues = {
        name: 'Updated Workflow',
        project: 'updated-project',
        description: 'Updated description',
        start_hint: 'Updated hint',
        icon_url: 'https://example.com/icon.png',
        shared: true,
        guardrail_assignments: [],
      }

      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.YAML.ID,
          visibleTabs: [TAB_DATA.YAML.ID],
          yamlConfig: 'states: []',
        }
      )

      const fields = ref.current?.getWorkflowFields()

      // Even though YAML tab is active, getWorkflowFields reads from generalConfigTabRef
      expect(fields).toEqual(mockGeneralConfigValues)
    })

    it('returns null when generalConfigTabRef is not initialized', () => {
      // When the Issues tab is the only visible tab, generalConfigTabRef won't be set
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.ISSUES.ID,
          visibleTabs: [TAB_DATA.ISSUES.ID],
          showIssuesPanel: true,
        }
      )

      const fields = ref.current?.getWorkflowFields()

      expect(fields).toBeNull()
    })
  })

  describe('triggerGeneralConfigValidation', () => {
    it('switches to Configuration tab and triggers validation', async () => {
      const onActiveTabChange = vi.fn()
      const ref = createRef<ConfigPanelRef>()
      renderConfigPanel(
        ref,
        {
          activeTab: TAB_DATA.YAML.ID,
          visibleTabs: [TAB_DATA.YAML.ID],
          yamlConfig: 'states: []',
          onActiveTabChange,
        }
      )

      await act(async () => {
        await ref.current!.triggerGeneralConfigValidation()
      })

      expect(onActiveTabChange).toHaveBeenCalledWith(TAB_DATA.CONFIGURATION.ID)
    })
  })
})
