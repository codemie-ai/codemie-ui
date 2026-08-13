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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SubAssistantUserMapping } from '../SubAssistantUserMapping'
import { UserMapping } from '../UserMapping'

const mocks = vi.hoisted(() => ({
  getUserMapping: vi.fn(),
  saveUserMappingSettings: vi.fn(),
  getAssistantToolkits: vi.fn(),
  toasterInfo: vi.fn(),
}))

vi.mock('@/store/assistants', async () => {
  const { proxy } = await import('valtio')
  return {
    assistantsStore: proxy({
      getUserMapping: mocks.getUserMapping,
      saveUserMappingSettings: mocks.saveUserMappingSettings,
      getAssistantToolkits: mocks.getAssistantToolkits,
    }),
  }
})

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    indexSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: mocks.toasterInfo, error: vi.fn() },
}))

// Stand-in for the toolkit rows: the checkbox behaviour under test only needs a way to make the
// section dirty so Save appears.
vi.mock('../components/Toolkit', () => ({
  Toolkit: ({
    toolkit,
    onUpdate,
  }: {
    toolkit: { tools?: { name: string }[] }
    onUpdate: (key: string, id: string, setting: unknown) => void
  }) => (
    <>
      <button type="button" onClick={() => onUpdate('MCP_srv', 'int-1', { id: 'int-1' })}>
        change integration
      </button>
      {(toolkit.tools ?? []).map((tool) => (
        <button
          key={tool.name}
          type="button"
          onClick={() =>
            onUpdate(`MCP_${tool.name}`, `int-${tool.name}`, { id: `int-${tool.name}` })
          }
        >
          change {tool.name}
        </button>
      ))}
    </>
  ),
}))

const assistant = {
  id: 'assistant-1',
  project: 'project-1',
  is_global: false,
  mcp_servers: [{ name: 'srv', enabled: true }],
} as never

const CHECKBOX_LABEL = /apply to the whole assistant/i

const renderSection = (workflowId?: string) =>
  render(
    <UserMapping
      assistant={assistant}
      onNewIntegrationRequest={vi.fn()}
      onSectionVisibilityChange={vi.fn()}
      workflowId={workflowId}
    />
  )

describe('UserMapping scope checkbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAssistantToolkits.mockResolvedValue([])
    mocks.saveUserMappingSettings.mockResolvedValue({})
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: true,
    })
  })

  afterEach(cleanup)

  it('does not offer the checkbox outside a workflow', async () => {
    renderSection()

    expect(await screen.findByText('Your Integration Settings')).toBeTruthy()
    expect(screen.queryByLabelText(CHECKBOX_LABEL)).toBeNull()
  })

  it('loads the assistant-scoped mapping outside a workflow', async () => {
    renderSection()

    // The fixture assistant exposes only an MCP slot, so no credential types are asked about.
    await waitFor(() =>
      expect(mocks.getUserMapping).toHaveBeenCalledWith('assistant-1', undefined, [])
    )
  })

  it('loads the effective mapping for the workflow', async () => {
    renderSection('workflow-1')

    await waitFor(() =>
      expect(mocks.getUserMapping).toHaveBeenCalledWith('assistant-1', 'workflow-1', [])
    )
  })

  it('leaves the checkbox unticked when an assistant-scoped selection exists', async () => {
    renderSection('workflow-1')

    const checkbox = await screen.findByLabelText(CHECKBOX_LABEL)
    expect((checkbox as HTMLInputElement).checked).toBe(false)
  })

  it('pre-ticks the checkbox when the user has no assistant-scoped selection yet', async () => {
    // A first-ever selection should not be silently confined to one workflow.
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: false,
    })

    renderSection('workflow-1')

    await waitFor(async () => expect(await screen.findByLabelText(CHECKBOX_LABEL)).toBeTruthy())
    expect(screen.getByLabelText<HTMLInputElement>(CHECKBOX_LABEL).checked).toBe(true)
  })

  it('saves in workflow scope while the checkbox is unticked', async () => {
    renderSection('workflow-1')

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith('assistant-1', expect.anything(), {
        workflowId: 'workflow-1',
        applyToAssistant: false,
      })
    )
  })

  it('saves for the whole assistant once the checkbox is ticked', async () => {
    renderSection('workflow-1')

    await userEvent.click(await screen.findByLabelText(CHECKBOX_LABEL))
    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith('assistant-1', expect.anything(), {
        workflowId: 'workflow-1',
        applyToAssistant: true,
      })
    )
  })

  it('offers the save once the checkbox alone is ticked', async () => {
    // Promoting what is already selected to the whole assistant is a change on its own: without it
    // the user would have to re-pick a slot just to make the save button appear.
    renderSection('workflow-1')

    await userEvent.click(await screen.findByLabelText(CHECKBOX_LABEL))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith('assistant-1', expect.anything(), {
        workflowId: 'workflow-1',
        applyToAssistant: true,
      })
    )
  })

  it('keeps the assistant-page save unscoped', async () => {
    renderSection()

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith(
        'assistant-1',
        expect.anything(),
        undefined
      )
    )
  })
})

describe('SubAssistantUserMapping scope', () => {
  const subAssistant = { id: 'sub-1', project: 'project-1' } as never
  const displayableToolkits = [
    {
      toolkit: 'MCP',
      label: 'MCP',
      tools: [
        { name: 'srv', label: 'srv' },
        { name: 'other', label: 'other' },
      ],
      settings_config: false,
    },
  ]

  // Two slots so a save can be checked for carrying only the one the user actually touched.
  const twoSlots = {
    MCP_srv: { originalName: 'MCP:srv', settingId: null, setting: null },
    MCP_other: { originalName: 'MCP:other', settingId: null, setting: null },
  } as never

  const renderSub = (workflowId?: string, applyToAssistant?: boolean) =>
    render(
      <SubAssistantUserMapping
        subAssistant={subAssistant}
        displayableToolkits={displayableToolkits}
        initialUserMappingSettings={twoSlots}
        project="project-1"
        onNewIntegrationRequest={vi.fn()}
        toolsDescriptions={{}}
        settingsOptions={{}}
        workflowId={workflowId}
        applyToAssistant={applyToAssistant}
      />
    )

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.saveUserMappingSettings.mockResolvedValue({})
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: true,
    })
  })

  afterEach(cleanup)

  it('saves sub-assistant settings in the scope chosen for the section', async () => {
    renderSub('workflow-1', false)

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith('sub-1', expect.anything(), {
        workflowId: 'workflow-1',
        applyToAssistant: false,
      })
    )
  })

  it('follows the section checkbox when it is ticked', async () => {
    renderSub('workflow-1', true)

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith('sub-1', expect.anything(), {
        workflowId: 'workflow-1',
        applyToAssistant: true,
      })
    )
  })

  it('sends only the slots the user changed when saving for a workflow', async () => {
    // Same rule as for the orchestrator: sending an untouched slot would freeze it into the
    // workflow row, so later assistant-page changes would stop reaching this workflow.
    renderSub('workflow-1', false)

    await userEvent.click(await screen.findByRole('button', { name: 'change other' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect(Object.keys(settings as Record<string, unknown>)).toEqual(['MCP_other'])
  })

  it('still sends every slot when the section saves for the whole assistant', async () => {
    renderSub('workflow-1', true)

    await userEvent.click(await screen.findByRole('button', { name: 'change other' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect(
      Object.keys(settings as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
    ).toEqual(['MCP_other', 'MCP_srv'])
  })

  it('stays assistant-scoped on the assistant page', async () => {
    renderSub()

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.saveUserMappingSettings).toHaveBeenCalledWith(
        'sub-1',
        expect.anything(),
        undefined
      )
    )
  })
})

describe('UserMapping scope payload and defaults', () => {
  const twoServerAssistant = {
    id: 'assistant-1',
    project: 'project-1',
    is_global: false,
    mcp_servers: [
      { name: 'srv', enabled: true },
      { name: 'other', enabled: true },
    ],
  } as never

  const orchestratorWithSub = {
    id: 'assistant-1',
    project: 'project-1',
    is_global: false,
    mcp_servers: [{ name: 'srv', enabled: true }],
    nested_assistants: [
      { id: 'sub-1', project: 'project-1', mcp_servers: [{ name: 'sub-srv', enabled: true }] },
    ],
  } as never

  const orchestratorWithoutOwnSlots = {
    id: 'assistant-1',
    project: 'project-1',
    is_global: false,
    mcp_servers: [],
    nested_assistants: [
      { id: 'sub-1', project: 'project-1', mcp_servers: [{ name: 'sub-srv', enabled: true }] },
    ],
  } as never

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAssistantToolkits.mockResolvedValue([])
    mocks.saveUserMappingSettings.mockResolvedValue({})
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: true,
    })
  })

  afterEach(cleanup)

  const renderFor = (assistantFixture: never, workflowId?: string) =>
    render(
      <UserMapping
        assistant={assistantFixture}
        onNewIntegrationRequest={vi.fn()}
        onSectionVisibilityChange={vi.fn()}
        workflowId={workflowId}
      />
    )

  it('sends only the slots the user changed when saving for a workflow', async () => {
    // Inherited slots must not be written into the workflow row, or later assistant-page changes
    // would stop reaching this workflow.
    renderFor(twoServerAssistant, 'workflow-1')

    await userEvent.click(await screen.findByRole('button', { name: 'change other' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect(Object.keys(settings as Record<string, unknown>)).toEqual(['MCP_other'])
  })

  it('still sends every slot when saving for the whole assistant', async () => {
    renderFor(twoServerAssistant, 'workflow-1')

    await userEvent.click(await screen.findByLabelText(CHECKBOX_LABEL))
    await userEvent.click(await screen.findByRole('button', { name: 'change other' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect(
      Object.keys(settings as Record<string, unknown>).sort((a, b) => a.localeCompare(b))
    ).toEqual(['MCP_other', 'MCP_srv'])
  })

  it('keeps the checkbox off when only a sub-assistant has an assistant-wide selection', async () => {
    // The checkbox saves sub-assistants too, so one existing selection must stop the pre-tick.
    mocks.getUserMapping.mockImplementation(async (assistantId: string) => ({
      tools_config: [],
      has_assistant_scope_selection: assistantId === 'sub-1',
    }))

    renderFor(orchestratorWithSub, 'workflow-1')

    const checkbox = await screen.findByLabelText(CHECKBOX_LABEL)
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(false))
  })

  it('resolves the checkbox default when only sub-assistants have mappable slots', async () => {
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: false,
    })

    renderFor(orchestratorWithoutOwnSlots, 'workflow-1')

    const checkbox = await screen.findByLabelText(CHECKBOX_LABEL)
    await waitFor(() => expect((checkbox as HTMLInputElement).checked).toBe(true))
  })
})

describe('UserMapping save confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAssistantToolkits.mockResolvedValue([])
    mocks.saveUserMappingSettings.mockResolvedValue({})
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: true,
    })
  })

  afterEach(cleanup)

  it('says the settings were saved for this workflow', async () => {
    renderSection('workflow-1')

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.toasterInfo).toHaveBeenCalledWith(
        'Your integration settings have been successfully saved for this workflow.'
      )
    )
  })

  it('says the settings were saved for the assistant when the checkbox is ticked', async () => {
    renderSection('workflow-1')

    await userEvent.click(await screen.findByLabelText(CHECKBOX_LABEL))
    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.toasterInfo).toHaveBeenCalledWith(
        'Your integration settings have been successfully saved for this assistant.'
      )
    )
  })

  it('keeps the assistant wording on the assistant page', async () => {
    renderSection()

    await userEvent.click(await screen.findByRole('button', { name: /change integration/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(mocks.toasterInfo).toHaveBeenCalledWith(
        'Your integration settings have been successfully saved for this assistant.'
      )
    )
  })
})

describe('UserMapping auto-lookup pre-selection', () => {
  const assistantWithJira = {
    id: 'assistant-1',
    project: 'project-1',
    is_global: true,
    toolkits: [
      {
        toolkit: 'jira',
        label: 'Jira',
        settings_config: true,
        tools: [{ name: 'generic_jira_tool', settings_config: false }],
      },
    ],
    mcp_servers: [{ name: 'srv', enabled: true }],
  } as never

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAssistantToolkits.mockResolvedValue([])
    mocks.saveUserMappingSettings.mockResolvedValue({})
  })

  afterEach(cleanup)

  const renderWith = (workflowId?: string) =>
    render(
      <UserMapping
        assistant={assistantWithJira}
        onNewIntegrationRequest={vi.fn()}
        onSectionVisibilityChange={vi.fn()}
        workflowId={workflowId}
      />
    )

  it('asks the backend what auto lookup resolves for the displayed non-MCP slots', async () => {
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: false,
    })

    renderWith()

    await waitFor(() => expect(mocks.getUserMapping).toHaveBeenCalled())
    const [, , credentialTypes] = mocks.getUserMapping.mock.calls[0]
    // MCP slots have no auto lookup at all, so they must not be asked about.
    expect(credentialTypes).toEqual(['jira'])
  })

  it('pre-selects the auto-resolved integration and persists it on save', async () => {
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [],
      has_assistant_scope_selection: false,
      auto_resolved: [{ credential_type: 'jira', integration_id: 'auto-jira' }],
    })

    renderWith('workflow-1')

    await waitFor(() => expect(mocks.getUserMapping).toHaveBeenCalled())
    // Save appears once something is dirty; the pre-selected slot must ride along with it.
    await userEvent.click(
      (
        await screen.findAllByRole('button', { name: /change integration/i })
      )[0]
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect((settings as Record<string, { settingId?: string }>).jira.settingId).toBe('auto-jira')
  })

  it('leaves an explicit selection untouched', async () => {
    mocks.getUserMapping.mockResolvedValue({
      tools_config: [{ name: 'jira', integration_id: 'explicit-jira' }],
      has_assistant_scope_selection: true,
      auto_resolved: [{ credential_type: 'jira', integration_id: 'auto-jira' }],
    })

    renderWith()

    await waitFor(() => expect(mocks.getUserMapping).toHaveBeenCalled())
    await userEvent.click(
      (
        await screen.findAllByRole('button', { name: /change integration/i })
      )[0]
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mocks.saveUserMappingSettings).toHaveBeenCalled())
    const [, settings] = mocks.saveUserMappingSettings.mock.calls[0]
    expect((settings as Record<string, { settingId?: string }>).jira.settingId).toBe(
      'explicit-jira'
    )
  })
})
