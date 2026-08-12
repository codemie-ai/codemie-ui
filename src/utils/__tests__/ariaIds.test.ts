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

import { dataSourceNameId, providerNameId, mcpServerNameId, workflowNameId } from '../ariaIds'

describe('ariaIds', () => {
  it('dataSourceNameId builds the datasource heading id', () => {
    expect(dataSourceNameId('ds-1')).toBe('datasource-name-ds-1')
  })

  it('providerNameId builds the provider heading id', () => {
    expect(providerNameId('prov-1')).toBe('provider-name-prov-1')
  })

  it('mcpServerNameId builds the MCP server heading id', () => {
    expect(mcpServerNameId('mcp-1')).toBe('admin-mcp-name-mcp-1')
  })

  it('workflowNameId builds the workflow heading id', () => {
    expect(workflowNameId('wf-1')).toBe('workflow-name-wf-1')
  })
})
