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
import { useSnapshot } from 'valtio'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { mcpStore } from '@/store/mcp'
import { MCPServerDetails } from '@/types/entity/mcp'

import MCPToolkit from '../MCPToolkit'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn(),
  }
})
vi.mock('@/store/mcp', () => ({
  mcpStore: { configs: [], getConfig: vi.fn() },
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

const mockUseSnapshot = vi.mocked(useSnapshot)

const baseServer: MCPServerDetails = {
  name: 'GitHub MCP',
  description: 'GitHub',
  enabled: true,
  mcp_config_id: 'cfg-1',
}

const defaultProps = {
  settingsDefinitions: [],
  mcpServers: [],
  onMcpServersChange: vi.fn(),
  showNewIntegrationPopup: vi.fn(),
  project: 'test',
  refreshSettings: vi.fn(),
}

const defaultSnapshot = {
  configs: [],
  pagination: { page: 0, perPage: 20, totalPages: 0, totalCount: 0 },
  loading: false,
  error: null,
}

const appInfoDefaultSnapshot = { configs: [] }

beforeEach(() => {
  mockUseSnapshot.mockImplementation((store: any) => {
    if (store === appInfoStore) return appInfoDefaultSnapshot
    return defaultSnapshot
  })
  vi.mocked(mcpStore.getConfig).mockClear()
  vi.mocked(mcpStore.getConfig).mockResolvedValue({} as any)
})

describe('MCPToolkit', () => {
  it('shows warning banner when unavailableIds is non-empty', () => {
    render(
      <MCPToolkit
        {...defaultProps}
        mcpServers={[{ ...baseServer, mcp_config_id: 'cfg-missing' }]}
      />
    )
    expect(
      screen.getByText(
        'Some MCP servers are unavailable. Remove them or contact your administrator.'
      )
    ).toBeInTheDocument()
  })

  it('does not show warning banner when all servers are available', () => {
    const mcpSnapshotWithConfig = {
      ...defaultSnapshot,
      configs: [{ id: 'cfg-1', is_active: true, is_public: true, name: 'GitHub MCP' }],
    }
    mockUseSnapshot.mockImplementation((store: any) => {
      if (store === appInfoStore) return appInfoDefaultSnapshot
      return mcpSnapshotWithConfig
    })
    render(<MCPToolkit {...defaultProps} mcpServers={[baseServer]} />)
    expect(
      screen.queryByText(
        'Some MCP servers are unavailable. Remove them or contact your administrator.'
      )
    ).toBeNull()
  })

  it('calls getConfig for each server with mcp_config_id not already in store', () => {
    render(<MCPToolkit {...defaultProps} mcpServers={[baseServer]} />)
    expect(mcpStore.getConfig).toHaveBeenCalledWith('cfg-1')
  })

  it('does not call getConfig when no servers have mcp_config_id', () => {
    render(
      <MCPToolkit {...defaultProps} mcpServers={[{ ...baseServer, mcp_config_id: undefined }]} />
    )
    expect(mcpStore.getConfig).not.toHaveBeenCalled()
  })

  it('does not call getConfig when config is already in store', () => {
    const mcpSnapshotWithConfig = {
      ...defaultSnapshot,
      configs: [{ id: 'cfg-1', is_active: true, is_public: true, name: 'GitHub MCP' }],
    }
    mockUseSnapshot.mockImplementation((store: any) => {
      if (store === appInfoStore) return appInfoDefaultSnapshot
      return mcpSnapshotWithConfig
    })
    ;(mcpStore as any).configs = [
      { id: 'cfg-1', is_active: true, is_public: true, name: 'GitHub MCP' },
    ]
    render(<MCPToolkit {...defaultProps} mcpServers={[baseServer]} />)
    expect(mcpStore.getConfig).not.toHaveBeenCalled()
    ;(mcpStore as any).configs = []
  })
})
