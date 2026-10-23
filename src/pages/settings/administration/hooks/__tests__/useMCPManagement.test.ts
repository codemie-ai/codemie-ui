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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { mcpStore } from '@/store/mcp'
import { MCPConfig } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

import { useMCPManagement } from '../useMCPManagement'

const serverA = { id: 'a', name: 'Server A' } as MCPConfig
const serverB = { id: 'b', name: 'Server B' } as MCPConfig

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
    cloneConfigFromForm: vi.fn(),
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

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the modal in clone mode immediately, with no record created and no store call', () => {
    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneMenuClick(baseServer)
    })

    expect(mcpStore.cloneConfigFromForm).not.toHaveBeenCalled()
    expect(result.current.showModal).toBe(true)
    expect(result.current.modalMode).toBe('clone')
    expect(result.current.cloneSource).toEqual(baseServer)
  })

  it('sets activeCloneId to the open row and clears it on close, leaving other rows unaffected', () => {
    const otherServer: MCPConfig = { ...baseServer, id: 'server-2' }
    const { result } = renderHook(() => useMCPManagement())

    expect(result.current.activeCloneId).toBeNull()

    act(() => {
      result.current.handleCloneMenuClick(baseServer)
    })

    expect(result.current.activeCloneId).toBe('server-1')
    expect(result.current.activeCloneId).not.toBe(otherServer.id)

    act(() => {
      result.current.handleModalClose()
    })

    expect(result.current.activeCloneId).toBeNull()
  })

  it('submits via cloneConfigFromForm exactly once in clone mode, not createConfig/updateConfig', async () => {
    vi.mocked(mcpStore.cloneConfigFromForm).mockResolvedValue({ ...baseServer, id: 'server-2' })
    const { result } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleCloneMenuClick(baseServer)
    })

    await act(async () => {
      await result.current.handleModalSubmit({ name: 'My Clone' })
    })

    expect(mcpStore.cloneConfigFromForm).toHaveBeenCalledTimes(1)
    expect(mcpStore.cloneConfigFromForm).toHaveBeenCalledWith('server-1', {
      name: 'My Clone',
    })
    expect(mcpStore.createConfig).not.toHaveBeenCalled()
    expect(mcpStore.updateConfig).not.toHaveBeenCalled()
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

// Unit tests mock valtio's useSnapshot to a pass-through (see src/setupTests.unit.ts), so a raw
// mcpStore mutation does not itself trigger a re-render; rerender() forces the hook to re-read
// the store, which is enough to prove the derivation logic below.
describe('useMCPManagement details panel', () => {
  beforeEach(() => {
    vi.spyOn(mcpStore, 'indexConfigs').mockResolvedValue([])
    mcpStore.configs = [serverA, serverB]
  })

  it('retains the last-known server snapshot when its config leaves the list while the panel is open', () => {
    const { result, rerender } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleViewDetails(serverA)
    })
    expect(result.current.detailsServer?.id).toBe('a')

    act(() => {
      mcpStore.configs = [serverB]
    })
    rerender()

    expect(result.current.detailsServer?.id).toBe('a')
  })

  it('clears the retained snapshot once the panel is explicitly closed', () => {
    const { result, rerender } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleViewDetails(serverA)
    })
    act(() => {
      mcpStore.configs = [serverB]
    })
    rerender()
    act(() => {
      result.current.handleCloseDetails()
    })

    expect(result.current.detailsServer).toBeNull()
  })

  it('still reflects live updates (e.g. a renamed config) while the config stays in the list', () => {
    const { result, rerender } = renderHook(() => useMCPManagement())

    act(() => {
      result.current.handleViewDetails(serverA)
    })
    act(() => {
      mcpStore.configs = [{ ...serverA, name: 'Renamed' } as MCPConfig, serverB]
    })
    rerender()

    expect(result.current.detailsServer?.name).toBe('Renamed')
  })
})
