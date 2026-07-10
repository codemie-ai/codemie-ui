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

const { mockUserStore } = vi.hoisted(() => ({
  mockUserStore: { user: null as null | { projects?: MockProject[] } },
}))

// Return the store as-is so the hook reads mockUserStore.user directly.
vi.mock('valtio', () => ({
  useSnapshot: <T>(store: T): T => store,
}))

vi.mock('@/store', () => ({
  userStore: mockUserStore,
}))

describe('useProjectDisplayNames', () => {
  beforeEach(() => {
    mockUserStore.user = null
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
})
