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

import { buildInlineMcpSettings, buildServerConfig } from '../MCPToolkitForm/formHelpers'

describe('buildServerConfig', () => {
  const baseValues = {
    name: 'test-server',
    description: 'Test description',
    tokensSizeLimit: null,
    configJson: '{"mcpServers":{"test":{"url":"http://localhost"}}}',
  }

  it('omits mcp_connect_url when connectUrl is empty string', () => {
    const result = buildServerConfig({ ...baseValues, connectUrl: '' })
    expect(result).not.toHaveProperty('mcp_connect_url')
  })

  it('omits mcp_connect_url when connectUrl is undefined', () => {
    const result = buildServerConfig({ ...baseValues, connectUrl: undefined })
    expect(result).not.toHaveProperty('mcp_connect_url')
  })

  it('includes mcp_connect_url when connectUrl has a value', () => {
    const url = 'https://mcp.example.com/sse'
    const result = buildServerConfig({ ...baseValues, connectUrl: url })
    expect(result.mcp_connect_url).toBe(url)
  })

  it('omits tools_tokens_size_limit when tokensSizeLimit is null', () => {
    const result = buildServerConfig({ ...baseValues, connectUrl: '' })
    expect(result).not.toHaveProperty('tools_tokens_size_limit')
  })

  it('includes tools_tokens_size_limit when provided', () => {
    const result = buildServerConfig({ ...baseValues, connectUrl: '', tokensSizeLimit: 5000 })
    expect(result.tools_tokens_size_limit).toBe(5000)
  })

  describe('catalogue-referenced servers under governance', () => {
    it('forces use_custom_config false and drops the custom config when isCatalogRef is true, even if a stale custom config was set', () => {
      const result = buildServerConfig(
        {
          ...baseValues,
          connectUrl: '',
          useCustomConfig: true,
          configJson: '{"command":"stale-custom-command"}',
        },
        'catalog-config-id',
        true
      )
      expect(result.use_custom_config).toBe(false)
      expect(result.config).toBeUndefined()
    })

    it('keeps the custom config when isCatalogRef is false', () => {
      const result = buildServerConfig(
        {
          ...baseValues,
          connectUrl: '',
          useCustomConfig: true,
          configJson: '{"command":"custom-command"}',
        },
        'catalog-config-id',
        false
      )
      expect(result.use_custom_config).toBe(true)
      expect(result.config).toEqual({ command: 'custom-command' })
    })
  })
})

describe('buildInlineMcpSettings', () => {
  it('builds id-less transient settings from typed values', () => {
    const result = buildInlineMcpSettings({ A: '1', B: '2' }, 'proj')

    expect(result).toEqual({
      credential_type: 'MCP',
      project_name: 'proj',
      credential_values: [
        { key: 'A', value: '1' },
        { key: 'B', value: '2' },
      ],
    })
    expect(result).not.toHaveProperty('id')
  })

  it('drops blank and whitespace-only values', () => {
    const result = buildInlineMcpSettings({ A: '  ', B: '', C: 'x' }, 'proj')

    expect(result?.credential_values).toEqual([{ key: 'C', value: 'x' }])
  })

  it('keeps surrounding spaces of a non-blank value as typed', () => {
    const result = buildInlineMcpSettings({ A: '  abc ' }, 'proj')

    expect(result?.credential_values).toEqual([{ key: 'A', value: '  abc ' }])
  })

  it('returns undefined when nothing usable was typed', () => {
    expect(buildInlineMcpSettings({}, 'proj')).toBeUndefined()
    expect(buildInlineMcpSettings({ A: ' ', B: '' }, 'proj')).toBeUndefined()
  })
})
