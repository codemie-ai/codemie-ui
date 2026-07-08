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
  getScopedMappingIntegrationOptions,
  initializeUserMappingSettings,
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
