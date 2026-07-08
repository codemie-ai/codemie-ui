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

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

import { InlineCredentialsContent } from '../InlineCredentialsContent'

// Each row renders: [logo] [name] on the left and [type] on the right. The name lives in the
// `.credential-type` span, the type in the `.credential-source` span, and the reused
// ToolkitIcon renders an <svg> inside the `.credential-icon` span.
const rowName = (container: HTMLElement) =>
  container.querySelector('.credential-type')?.textContent?.trim()
const rowType = (container: HTMLElement) =>
  container.querySelector('.credential-source')?.textContent?.trim()
const rowHasIcon = (container: HTMLElement) =>
  Boolean(container.querySelector('.credential-icon svg'))

describe('InlineCredentialsContent — Credential Review rows (logo + name + type)', () => {
  it('MCP inline base config: name = server, type = MCP, MCP logo, env var as detail', () => {
    const { container } = render(
      <InlineCredentialsContent
        credentials={[
          {
            credential_type: 'mcp_inline_config_env',
            mcp_server: 'Test MCP',
            toolkit: 'MCP',
            env_vars: ['MY_FLAG'],
          },
        ]}
      />
    )

    expect(rowName(container)).toBe('Test MCP')
    expect(rowType(container)).toBe('MCP')
    expect(rowHasIcon(container)).toBe(true)
    // No raw humanized technical type anywhere.
    expect(screen.queryByText('Mcp Inline Config Env')).not.toBeInTheDocument()
    // Env vars kept as a detail below.
    expect(screen.getByText('MY_FLAG')).toBeInTheDocument()
  })

  it('MCP auth token base config: name = server, type = MCP', () => {
    const { container } = render(
      <InlineCredentialsContent
        credentials={[{ credential_type: 'mcp_auth_token', mcp_server: 'Test MCP', toolkit: 'MCP' }]}
      />
    )

    expect(rowName(container)).toBe('Test MCP')
    expect(rowType(container)).toBe('MCP')
    expect(screen.queryByText('Mcp Auth Token')).not.toBeInTheDocument()
  })

  it('pinned USER integration: name = alias, type = integration type, logo present', () => {
    const { container } = render(
      <InlineCredentialsContent
        credentials={[
          {
            credential_type: 'Jira',
            integration_alias: 'my personal jira',
            mcp_server: 'jira-mcp',
            toolkit: 'MCP',
          },
        ]}
      />
    )

    expect(rowName(container)).toBe('my personal jira')
    expect(rowType(container)).toBe('Jira')
    expect(rowHasIcon(container)).toBe(true)
  })

  it('non-MCP toolkit credential: name = label, type = toolkit, logo present', () => {
    const { container } = render(
      <InlineCredentialsContent
        credentials={[
          {
            credential_type: 'tool_settings',
            toolkit: 'Project Management',
            label: 'Generic Jira',
          },
        ]}
      />
    )

    expect(rowName(container)).toBe('Generic Jira')
    expect(rowType(container)).toBe('Project Management')
    expect(rowHasIcon(container)).toBe(true)
  })
})
