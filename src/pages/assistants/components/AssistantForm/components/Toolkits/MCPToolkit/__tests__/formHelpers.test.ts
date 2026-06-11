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

import { buildServerConfig } from '../MCPToolkitForm/formHelpers'

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
})
