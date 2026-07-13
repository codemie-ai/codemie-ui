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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useProjectDisplayNames } from '../useProjectDisplayNames'

type MockProject = { name: string; display_name?: string | null }

const { mockUserStore, mockProjectDisplayNamesStore } = vi.hoisted(() => ({
  mockUserStore: {
    user: null as null | { isAdmin?: boolean; projects?: MockProject[] },
  },
  mockProjectDisplayNamesStore: {
    cache: {} as Record<string, string>,
    ensure: vi.fn(),
  },
}))

// Return the store as-is so the hook reads mockUserStore.user directly.
vi.mock('valtio', () => ({
  useSnapshot: <T>(store: T): T => store,
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

vi.mock('@/store/projectDisplayNames', () => ({
  projectDisplayNamesStore: mockProjectDisplayNamesStore,
}))

describe('useProjectDisplayNames', () => {
  beforeEach(() => {
    mockUserStore.user = null
    mockProjectDisplayNamesStore.cache = {}
    mockProjectDisplayNamesStore.ensure.mockReset()
  })

  it('returns an empty map when there is no user', () => {
    const { result } = renderHook(() => useProjectDisplayNames())
    expect(result.current.size).toBe(0)
  })

  it('returns an empty map when the user has no projects', () => {
    mockUserStore.user = {}
    const { result } = renderHook(() => useProjectDisplayNames())
    expect(result.current.size).toBe(0)
  })

  it('maps each project name to its display name', () => {
    mockUserStore.user = {
      projects: [
        { name: 'proj-a', display_name: 'Project Alpha' },
        { name: 'proj-b', display_name: 'Project Beta' },
      ],
    }
    const { result } = renderHook(() => useProjectDisplayNames())
    expect(result.current.size).toBe(2)
    expect(result.current.get('proj-a')).toBe('Project Alpha')
    expect(result.current.get('proj-b')).toBe('Project Beta')
  })

  it('excludes projects whose display name is null, undefined, empty, or whitespace', () => {
    mockUserStore.user = {
      projects: [
        { name: 'with-name', display_name: 'Has Name' },
        { name: 'null-name', display_name: null },
        { name: 'undefined-name' },
        { name: 'empty-name', display_name: '' },
        { name: 'blank-name', display_name: '   ' },
      ],
    }
    const { result } = renderHook(() => useProjectDisplayNames())
    expect(result.current.size).toBe(1)
    expect(result.current.get('with-name')).toBe('Has Name')
    expect(result.current.has('null-name')).toBe(false)
    expect(result.current.has('undefined-name')).toBe(false)
    expect(result.current.has('empty-name')).toBe(false)
    expect(result.current.has('blank-name')).toBe(false)
  })

  it('trims surrounding whitespace from the display name', () => {
    mockUserStore.user = {
      projects: [{ name: 'proj', display_name: '  Padded Name  ' }],
    }
    const { result } = renderHook(() => useProjectDisplayNames())
    expect(result.current.get('proj')).toBe('Padded Name')
  })

  describe('Super Admin lazy resolution', () => {
    it('merges lazily-fetched admin display names with the roster', () => {
      mockUserStore.user = {
        isAdmin: true,
        projects: [{ name: 'assigned', display_name: 'Assigned Project' }],
      }
      mockProjectDisplayNamesStore.cache = { unassigned: 'Unassigned Project' }

      const { result } = renderHook(() => useProjectDisplayNames())

      expect(result.current.get('assigned')).toBe('Assigned Project')
      expect(result.current.get('unassigned')).toBe('Unassigned Project')
    })

    it('ignores empty cache entries (resolved with no display name)', () => {
      mockUserStore.user = { isAdmin: true, projects: [] }
      mockProjectDisplayNamesStore.cache = { 'no-name': '' }

      const { result } = renderHook(() => useProjectDisplayNames('no-name'))

      expect(result.current.has('no-name')).toBe(false)
    })

    it('lets the roster win over the cache for the same project', () => {
      mockUserStore.user = {
        isAdmin: true,
        projects: [{ name: 'proj', display_name: 'Roster Name' }],
      }
      mockProjectDisplayNamesStore.cache = { proj: 'Cache Name' }

      const { result } = renderHook(() => useProjectDisplayNames('proj'))

      expect(result.current.get('proj')).toBe('Roster Name')
    })

    it('triggers a lazy fetch for a requested name outside the admin roster', () => {
      mockUserStore.user = { isAdmin: true, projects: [] }

      renderHook(() => useProjectDisplayNames('unassigned'))

      expect(mockProjectDisplayNamesStore.ensure).toHaveBeenCalledWith('unassigned')
    })

    it('accepts an array of names and fetches each uncovered one', () => {
      mockUserStore.user = {
        isAdmin: true,
        projects: [{ name: 'assigned', display_name: 'Assigned' }],
      }

      renderHook(() => useProjectDisplayNames(['assigned', 'unassigned-a', 'unassigned-b']))

      expect(mockProjectDisplayNamesStore.ensure).not.toHaveBeenCalledWith('assigned')
      expect(mockProjectDisplayNamesStore.ensure).toHaveBeenCalledWith('unassigned-a')
      expect(mockProjectDisplayNamesStore.ensure).toHaveBeenCalledWith('unassigned-b')
    })

    it('does not fetch when the requested project is already in the roster', () => {
      mockUserStore.user = {
        isAdmin: true,
        projects: [{ name: 'assigned', display_name: 'Assigned' }],
      }

      renderHook(() => useProjectDisplayNames('assigned'))

      expect(mockProjectDisplayNamesStore.ensure).not.toHaveBeenCalled()
    })

    it('never fetches for non-admin users, even for unknown projects', () => {
      mockUserStore.user = { isAdmin: false, projects: [] }

      renderHook(() => useProjectDisplayNames('unassigned'))

      expect(mockProjectDisplayNamesStore.ensure).not.toHaveBeenCalled()
    })

    it('does not fetch when no names are requested', () => {
      mockUserStore.user = { isAdmin: true, projects: [] }

      renderHook(() => useProjectDisplayNames())

      expect(mockProjectDisplayNamesStore.ensure).not.toHaveBeenCalled()
    })
  })
})
