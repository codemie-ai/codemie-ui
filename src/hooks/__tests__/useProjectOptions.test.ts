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
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetProjects = vi.fn()

vi.mock('@/store', () => ({
  userStore: {
    getProjects: (...args: unknown[]) => mockGetProjects(...args),
  },
}))

describe('useProjectOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with empty projectOptions', async () => {
    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    expect(result.current.projectOptions).toEqual([])
  })

  it('maps projects to label/value using display_name when available', async () => {
    mockGetProjects.mockResolvedValue([
      { name: 'proj-a', display_name: 'Project Alpha' },
      { name: 'proj-b', display_name: null },
    ])

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    await act(async () => {
      await result.current.loadProjectOptions()
    })

    expect(result.current.projectOptions).toEqual([
      { label: 'Project Alpha', value: 'proj-a' },
      { label: 'proj-b', value: 'proj-b' },
    ])
  })

  it('falls back to project name when display_name is undefined', async () => {
    mockGetProjects.mockResolvedValue([{ name: 'my-project' }])

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    await act(async () => {
      await result.current.loadProjectOptions()
    })

    expect(result.current.projectOptions[0]).toEqual({ label: 'my-project', value: 'my-project' })
  })

  it('passes the search value to getProjects', async () => {
    mockGetProjects.mockResolvedValue([])

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    await act(async () => {
      await result.current.loadProjectOptions('search-term')
    })

    expect(mockGetProjects).toHaveBeenCalledWith('search-term')
  })

  it('uses empty string as default search value', async () => {
    mockGetProjects.mockResolvedValue([])

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    await act(async () => {
      await result.current.loadProjectOptions()
    })

    expect(mockGetProjects).toHaveBeenCalledWith('')
  })

  it('leaves projectOptions unchanged when getProjects throws', async () => {
    mockGetProjects.mockRejectedValue(new Error('API failure'))

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result } = renderHook(() => useProjectOptions())

    await act(async () => {
      await result.current.loadProjectOptions()
    })

    expect(result.current.projectOptions).toEqual([])
  })

  it('returns a stable loadProjectOptions reference across re-renders', async () => {
    mockGetProjects.mockResolvedValue([])

    const { useProjectOptions } = await import('../useProjectOptions')
    const { result, rerender } = renderHook(() => useProjectOptions())

    const firstRef = result.current.loadProjectOptions
    rerender()
    expect(result.current.loadProjectOptions).toBe(firstRef)
  })
})
