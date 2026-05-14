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
import { describe, it, expect, vi } from 'vitest'

import { MCPServerDetails } from '@/types/entity/mcp'

import MCPServerDetail from '../MCPServerDetail'

vi.mock('@/components/NavigationMore', () => ({
  default: ({ items, children }: any) => (
    <div data-testid="nav-more">
      {children}
      {items.map((item: any) => (
        <button key={item.title} onClick={item.onClick}>
          {item.title}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../MCPToolkitTest', () => ({ default: () => <button>Test Connection</button> }))
vi.mock('../IntegrationSelector', () => ({
  default: () => <div data-testid="integration-selector" />,
}))

const server: MCPServerDetails = {
  name: 'GitHub MCP',
  description: 'GitHub integration',
  enabled: true,
  mcp_config_id: 'cfg-1',
}

describe('MCPServerDetail', () => {
  it('shows Edit and Delete actions when available', () => {
    render(
      <MCPServerDetail
        server={server}
        settingsDefinitions={[]}
        isSelected
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        showNewIntegrationPopup={vi.fn()}
      />
    )
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(
      screen.queryByText('This MCP server is no longer available. You can safely delete it.')
    ).toBeNull()
  })

  it('hides Edit and shows unavailability message when isUnavailable', () => {
    render(
      <MCPServerDetail
        server={server}
        settingsDefinitions={[]}
        isSelected
        isUnavailable
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        showNewIntegrationPopup={vi.fn()}
      />
    )
    expect(screen.queryByText('Edit')).toBeNull()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(
      screen.getByText('This MCP server is no longer available. You can safely delete it.')
    ).toBeInTheDocument()
  })
})
