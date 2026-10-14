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

import { describe, expect, it } from 'vitest'

import { MCPConfig } from '@/types/entity/mcp'

import { collectCopyValuePaths } from '../useMCPCopyValuesDialog'

const baseConfig: Omit<MCPConfig, 'config'> = {
  id: 'server-1',
  name: 'Test Server',
  categories: [],
  required_env_vars: [],
  user_id: 'user-1',
  project: 'project-1',
  is_public: false,
  is_system: false,
  usage_count: 0,
  is_active: true,
}

describe('collectCopyValuePaths', () => {
  it('collects headers, env, args and url query sections in order', () => {
    const server: MCPConfig = {
      ...baseConfig,
      config: {
        headers: { Authorization: 'x', 'X-Custom': 'y' },
        env: { API_KEY: 'z' },
        args: ['--flag', 'value'],
        url: 'https://example.com/mcp?token=abc&region=us',
      },
    }

    expect(collectCopyValuePaths(server)).toEqual([
      { section: 'headers', keys: ['headers.Authorization', 'headers.X-Custom'] },
      { section: 'env', keys: ['env.API_KEY'] },
      { section: 'args', keys: ['args[0]', 'args[1]'] },
      { section: 'url', keys: ['url.query.token', 'url.query.region'] },
    ])
  })

  it('omits empty sections entirely', () => {
    const server: MCPConfig = {
      ...baseConfig,
      config: {
        headers: { Authorization: 'x' },
        args: ['--flag'],
      },
    }

    expect(collectCopyValuePaths(server)).toEqual([
      { section: 'headers', keys: ['headers.Authorization'] },
      { section: 'args', keys: ['args[0]'] },
    ])
  })

  it('returns empty array for null server or empty config', () => {
    expect(collectCopyValuePaths(null)).toEqual([])

    const serverWithoutConfig: MCPConfig = {
      ...baseConfig,
    }
    expect(collectCopyValuePaths(serverWithoutConfig)).toEqual([])

    const serverWithEmptyConfig: MCPConfig = {
      ...baseConfig,
      config: {},
    }
    expect(collectCopyValuePaths(serverWithEmptyConfig)).toEqual([])
  })
})
