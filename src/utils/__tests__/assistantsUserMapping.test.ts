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

import { initializeUserMappingSettings } from '@/utils/assistants'

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
