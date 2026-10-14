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

import { renderHook, act } from '@testing-library/react'
import { useSnapshot } from 'valtio'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPConfigCloneResponse } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

import { useMCPManagement } from '../useMCPManagement'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn(),
  }
})

vi.mock('@/store/mcp', () => ({
  mcpStore: {
    pagination: { page: 0, perPage: 10, totalPages: 0, totalCount: 0 },
    indexConfigs: vi.fn().mockResolvedValue([]),
    cloneConfig: vi.fn(),
    updateConfig: vi.fn(),
    createConfig: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const mockUseSnapshot = vi.mocked(useSnapshot)

const baseServer: MCPConfig = {
  id: 'server-1',
  name: 'Server One',
  categories: [],
  required_env_vars: [],
  user_id: 'user-1',
  project: 'project-1',
  is_public: false,
  is_system: false,
  usage_count: 0,
  is_active: true,
}

describe('useMCPManagement - clone flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshot.mockReturnValue(mcpStore as unknown as typeof mcpStore)
    vi.mocked(mcpStore.indexConfigs).mockResolvedValue([])
  })

  it('directly clones a server with no copyable values', async () => {
    const server: MCPConfig = { ...baseServer, config: {} }
    vi.mocked(mcpStore.cloneConfig).mockResolvedValue({
      ...server,
      stripped_fields: [],
    } as MCPConfigCloneResponse)

    const { result } = renderHook(() => useMCPManagement())

    await act(async () => {
      result.current.handleCloneServer(server)
    })

    expect(mcpStore.cloneConfig).toHaveBeenCalledWith('server-1', undefined)
    expect(result.current.cloneDialogServer).toBeNull()
  })

  it('opens the dialog for a server with copyable values and does not clone yet', () => {
    const server: MCPConfig = {
      ...baseServer,
      config: { headers: { Authorization: 'secret' } },
    }

    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneServer(server)
    })

    expect(mcpStore.cloneConfig).not.toHaveBeenCalled()
    expect(result.current.cloneDialogServer).toEqual(server)
  })

  it('confirms clone with chosen copy values and updates modal state', async () => {
    const server: MCPConfig = {
      ...baseServer,
      config: { headers: { Authorization: 'secret' } },
    }
    const response: MCPConfigCloneResponse = {
      ...server,
      id: 'server-2',
      stripped_fields: ['config.auth_token'],
    }
    vi.mocked(mcpStore.cloneConfig).mockResolvedValue(response)

    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneServer(server)
    })

    await act(async () => {
      await result.current.handleConfirmClone(['headers.Authorization'])
    })

    expect(mcpStore.cloneConfig).toHaveBeenCalledWith('server-1', ['headers.Authorization'])
    expect(result.current.editingServer).toEqual(response)
    expect(result.current.showModal).toBe(true)
    expect(result.current.strippedFields).toEqual(['config.auth_token'])
    expect(result.current.cloneDialogServer).toBeNull()
  })

  it('shows a toaster error and leaves modal state unchanged on failure', async () => {
    const server: MCPConfig = {
      ...baseServer,
      config: { headers: { Authorization: 'secret' } },
    }
    vi.mocked(mcpStore.cloneConfig).mockRejectedValue({
      response: { data: { message: 'boom' } },
    })

    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneServer(server)
    })

    await act(async () => {
      await result.current.handleConfirmClone(['headers.Authorization'])
    })

    expect(toaster.error).toHaveBeenCalledWith('boom')
    expect(result.current.showModal).toBe(false)
    expect(result.current.editingServer).toBeNull()
  })
})

describe('useMCPManagement - submit warnings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSnapshot.mockReturnValue(mcpStore as unknown as typeof mcpStore)
    vi.mocked(mcpStore.indexConfigs).mockResolvedValue([])
  })

  it('shows a toaster info when the update response has a placeholder_value_present warning', async () => {
    const server: MCPConfig = { ...baseServer }
    vi.mocked(mcpStore.updateConfig).mockResolvedValue({
      ...server,
      warnings: [{ code: 'placeholder_value_present', message: 'Re-enter the token' }],
    })

    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleEditServer(server)
    })

    await act(async () => {
      await result.current.handleModalSubmit({ name: 'Server One' })
    })

    expect(toaster.info).toHaveBeenCalledWith('Re-enter the token')
  })

  it('does not show a toaster info when the update response has no warnings', async () => {
    const server: MCPConfig = { ...baseServer }
    vi.mocked(mcpStore.updateConfig).mockResolvedValue({
      ...server,
      warnings: [],
    })

    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleEditServer(server)
    })

    await act(async () => {
      await result.current.handleModalSubmit({ name: 'Server One' })
    })

    expect(toaster.info).not.toHaveBeenCalled()
  })
})
