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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID } from '@/constants/mcp'
import { appInfoStore } from '@/store/appInfo'

import { isMCPRestrictedMode } from '../mcpMode'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

describe('isMCPRestrictedMode', () => {
  beforeEach(() => {
    appInfoStore.configs = []
  })

  it('returns false when config entry is absent', () => {
    expect(isMCPRestrictedMode()).toBe(false)
  })

  it('returns true when settings.enabled is true', () => {
    appInfoStore.configs = [
      { id: MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID, settings: { enabled: true } } as any,
    ]
    expect(isMCPRestrictedMode()).toBe(true)
  })

  it('returns false when settings.enabled is false', () => {
    appInfoStore.configs = [
      { id: MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID, settings: { enabled: false } } as any,
    ]
    expect(isMCPRestrictedMode()).toBe(false)
  })

  it('ignores unrelated config entries', () => {
    appInfoStore.configs = [{ id: 'somethingElse', settings: { enabled: true } } as any]
    expect(isMCPRestrictedMode()).toBe(false)
  })
})
