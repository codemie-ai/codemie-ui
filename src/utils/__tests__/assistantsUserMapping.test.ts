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

import { describe, it, expect } from 'vitest'

import {
  applyAutoResolvedIntegrations,
  collectAutoLookupCredentialTypes,
  getScopedMappingIntegrationOptions,
  getDisplayableToolkits,
  initializeUserMappingSettings,
  isUserMappingSupported,
} from '@/utils/assistants'

describe('initializeUserMappingSettings — two-state MCP selection', () => {
  const assistant = {
    is_global: false,
    mcp_servers: [
      { name: 'srv-default', enabled: true }, // no settings -> non-pinned, user-selectable
      { name: 'srv-explicit', enabled: true },
      { name: 'srv-pinned', enabled: true, settings: { id: 'pinned-1' } }, // pinned -> no slot
    ],
  }

  it('creates slots only for non-pinned enabled MCP servers', () => {
    const result = initializeUserMappingSettings(assistant)

    expect(Object.keys(result).sort()).toEqual(['MCP_srv-default', 'MCP_srv-explicit'])
    expect(result['MCP_srv-pinned']).toBeUndefined()
  })

  it('applies the persisted explicit selection; a slot without a mapping stays DEFAULT', () => {
    const userMapping = {
      tools_config: [{ name: 'MCP:srv-explicit', integration_id: 'int-77' }],
    }

    const result = initializeUserMappingSettings(assistant, userMapping)

    // DEFAULT slot: no explicit selection -> base config.
    expect(result['MCP_srv-default'].settingId).toBeFalsy()

    // EXPLICIT INTEGRATION slot: stored uuid.
    expect(result['MCP_srv-explicit'].settingId).toBe('int-77')
  })
})

describe('getScopedMappingIntegrationOptions — scope depends on assistant type', () => {
  const settings = {
    mcp: [
      { id: 'u-here', alias: 'user here', setting_type: 'user', project_name: 'proj-a' },
      { id: 'u-other', alias: 'user other', setting_type: 'user', project_name: 'proj-b' },
      {
        id: 'u-global',
        alias: 'user global',
        setting_type: 'user',
        project_name: 'proj-b',
        is_global: true,
      },
      { id: 'p-here', alias: 'proj here', setting_type: 'project', project_name: 'proj-a' },
      { id: 'p-other', alias: 'proj other', setting_type: 'project', project_name: 'proj-b' },
    ],
  }

  it('project-shared: own-project USER or global USER, and only this-project PROJECT', () => {
    const result = getScopedMappingIntegrationOptions(settings, 'proj-a', false)
    expect(result.mcp.map((s) => s.id).sort()).toEqual(['p-here', 'u-global', 'u-here'])
  })

  it('project-shared: hides USER integrations of other projects', () => {
    const result = getScopedMappingIntegrationOptions(settings, 'proj-a', false)
    expect(result.mcp.some((s) => s.id === 'u-other')).toBe(false)
    expect(result.mcp.some((s) => s.id === 'p-other')).toBe(false)
  })

  it('marketplace: offers every USER and PROJECT integration (any project)', () => {
    const result = getScopedMappingIntegrationOptions(settings, 'proj-a', true)
    expect(result.mcp.map((s) => s.id).sort()).toEqual([
      'p-here',
      'p-other',
      'u-global',
      'u-here',
      'u-other',
    ])
  })

  it('defaults to project-shared scoping when the marketplace flag is omitted', () => {
    const result = getScopedMappingIntegrationOptions(settings, 'proj-a')
    expect(result.mcp.some((s) => s.id === 'p-other')).toBe(false)
  })
})

describe('regular toolkits follow the same pinned rule as MCP servers', () => {
  // Marketplace assistant: regular toolkits/tools participate in per-user mapping, but a slot the
  // author already pinned must not be offered — the author's integration wins at runtime, so a
  // dropdown there would promise a choice the run ignores.
  const assistant = {
    is_global: true,
    toolkits: [
      {
        toolkit: 'jira',
        label: 'Jira',
        settings_config: true,
        tools: [{ name: 'generic_jira', settings_config: false }],
      },
      {
        toolkit: 'confluence',
        label: 'Confluence',
        settings_config: true,
        settings: { id: 'author-confluence' },
        tools: [{ name: 'generic_confluence', settings_config: false }],
      },
      {
        toolkit: 'vcs',
        label: 'VCS',
        settings_config: false,
        tools: [
          { name: 'github_tool', settings_config: true },
          { name: 'gitlab_tool', settings_config: true, settings: { id: 'author-gitlab' } },
        ],
      },
    ],
  }

  it('creates slots only for toolkits and tools the author left unpinned', () => {
    const result = initializeUserMappingSettings(assistant)

    expect(Object.keys(result).sort()).toEqual(['jira', 'vcs_github_tool'])
    expect(result.confluence).toBeUndefined()
    expect(result.vcs_gitlab_tool).toBeUndefined()
  })

  it('hides a toolkit whose every configurable slot is pinned', () => {
    const displayable = getDisplayableToolkits(assistant).map((tk: { toolkit: string }) => tk.toolkit)

    expect(displayable).toContain('jira')
    expect(displayable).toContain('vcs')
    expect(displayable).not.toContain('confluence')
  })
})

describe('project-shared assistants offer the same slots as marketplace ones', () => {
  // Regular toolkits used to be marketplace-only on the frontend even though the backend resolved
  // their per-user mapping for project-shared assistants too.
  const projectShared = {
    is_global: false,
    shared: true,
    toolkits: [
      {
        toolkit: 'jira',
        label: 'Jira',
        settings_config: true,
        tools: [{ name: 'generic_jira', settings_config: false }],
      },
    ],
    mcp_servers: [],
  }

  it('creates regular-tool slots for a project-shared assistant', () => {
    expect(Object.keys(initializeUserMappingSettings(projectShared))).toEqual(['jira'])
  })

  it('shows the toolkit for a project-shared assistant', () => {
    expect(getDisplayableToolkits(projectShared).map((tk: { toolkit: string }) => tk.toolkit)).toEqual([
      'jira',
    ])
  })

  it('renders the section for a project-shared assistant with no MCP servers', () => {
    expect(isUserMappingSupported(projectShared as never)).toBe(true)
  })

  it('still renders nothing for a private assistant', () => {
    const privateAssistant = { ...projectShared, shared: false }

    expect(isUserMappingSupported(privateAssistant as never)).toBe(false)
  })
})

describe('auto lookup helpers', () => {
  const assistant = {
    is_global: true,
    toolkits: [
      { toolkit: 'jira', label: 'Jira', settings_config: true, tools: [] },
      { toolkit: 'confluence', label: 'Confluence', settings_config: true, tools: [] },
    ],
    mcp_servers: [{ name: 'srv', enabled: true }],
  }

  it('collects credential types of non-MCP slots only', () => {
    // MCP has no auto lookup: without a selection it runs on the author's base config.
    expect(collectAutoLookupCredentialTypes(assistant).sort()).toEqual(['confluence', 'jira'])
  })

  it('fills empty slots and reports which ones it touched', () => {
    const settings: Record<string, { credentialType: string; settingId: string | null }> = {
      jira: { credentialType: 'jira', settingId: null },
      confluence: { credentialType: 'confluence', settingId: 'explicit-confluence' },
    }

    const touched = applyAutoResolvedIntegrations(settings, [
      { credential_type: 'jira', integration_id: 'auto-jira' },
      { credential_type: 'confluence', integration_id: 'auto-confluence' },
    ])

    expect(touched).toEqual(['jira'])
    expect(settings.jira.settingId).toBe('auto-jira')
    // An explicit choice always wins over what auto lookup would have picked.
    expect(settings.confluence.settingId).toBe('explicit-confluence')
  })

  it('does nothing without resolved values', () => {
    const settings = { jira: { credentialType: 'jira', settingId: null } }

    expect(applyAutoResolvedIntegrations(settings, [])).toEqual([])
    expect(applyAutoResolvedIntegrations(settings, undefined)).toEqual([])
    expect(settings.jira.settingId).toBeNull()
  })
})

describe('slot state: auto lookup flag and explicit none', () => {
  const assistant = {
    is_global: true,
    toolkits: [
      { toolkit: 'jira', label: 'Jira', settings_config: true, tools: [] },
      {
        toolkit: 'confluence',
        label: 'Confluence',
        settings_config: true,
        auto_credentials_lookup: false,
        tools: [],
      },
    ],
    mcp_servers: [],
  }

  it('carries the author auto-lookup flag into the slot', () => {
    const settings = initializeUserMappingSettings(assistant)

    expect(settings.jira.autoLookup).toBe(true)
    expect(settings.confluence.autoLookup).toBe(false)
  })

  it('marks a stored empty integration as an explicit "no integration"', () => {
    // The backend keeps such a slot on purpose; the panel must not treat it as "nothing chosen".
    const settings = initializeUserMappingSettings(assistant, {
      tools_config: [{ name: 'jira', integration_id: '' }],
    })

    expect(settings.jira.explicitNone).toBe(true)
    expect(settings.jira.settingId).toBeFalsy()
  })

  it('never pre-selects a slot with auto lookup off or an explicit none', () => {
    const settings = initializeUserMappingSettings(assistant, {
      tools_config: [{ name: 'jira', integration_id: '' }],
    })

    const touched = applyAutoResolvedIntegrations(settings, [
      { credential_type: 'jira', integration_id: 'auto-jira' },
      { credential_type: 'confluence', integration_id: 'auto-confluence' },
    ])

    expect(touched).toEqual([])
    expect(settings.jira.settingId).toBeFalsy()
    expect(settings.confluence.settingId).toBeFalsy()
  })

  it('asks only about slots where auto lookup is on', () => {
    expect(collectAutoLookupCredentialTypes(assistant)).toEqual(['jira'])
  })
})
