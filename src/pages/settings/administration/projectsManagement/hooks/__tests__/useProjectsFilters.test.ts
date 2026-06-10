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

import * as filtersModule from '@/utils/filters'

import { useProjectsFilters } from '../useProjectsFilters'

// In-memory store that simulates the localStorage-backed filters
const filterStore: Record<string, unknown> = {}

vi.mock('@/utils/filters', () => ({
  FILTER_ENTITY: { PROJECTS: 'projects' },
  getFilters: vi.fn(() => ({})),
  setFilters: vi.fn(),
}))

describe('useProjectsFilters', () => {
  beforeEach(() => {
    // Reset in-memory store
    Object.keys(filterStore).forEach((k) => delete filterStore[k])
    vi.clearAllMocks()

    // Default: getFilters returns current filterStore snapshot; setFilters updates it
    vi.mocked(filtersModule.getFilters).mockImplementation(() => ({ ...filterStore } as any))
    vi.mocked(filtersModule.setFilters).mockImplementation((_key, filters) => {
      Object.keys(filterStore).forEach((k) => delete filterStore[k])
      Object.assign(filterStore, filters)
    })
  })

  it('returns default values when nothing is stored', () => {
    const { result } = renderHook(() => useProjectsFilters())
    expect(result.current.search).toBe('')
    expect(result.current.budgetAssignmentFilter).toBe('all')
    expect(result.current.budgetCategory).toBe('')
  })

  it('restores search from localStorage', () => {
    Object.assign(filterStore, { search: 'my project' })
    const { result } = renderHook(() => useProjectsFilters())
    expect(result.current.search).toBe('my project')
  })

  it('restores budgetAssignmentFilter from localStorage', () => {
    Object.assign(filterStore, { budget_assignment: 'assigned' })
    const { result } = renderHook(() => useProjectsFilters())
    expect(result.current.budgetAssignmentFilter).toBe('assigned')
  })

  it('restores budgetCategory from localStorage', () => {
    Object.assign(filterStore, { budget_category: 'platform' })
    const { result } = renderHook(() => useProjectsFilters())
    expect(result.current.budgetCategory).toBe('platform')
  })

  it('setSearch updates the state', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setSearch('apollo')
    })
    expect(result.current.search).toBe('apollo')
  })

  it('setBudgetAssignmentFilter updates the state', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setBudgetAssignmentFilter('assigned')
    })
    expect(result.current.budgetAssignmentFilter).toBe('assigned')
  })

  it('setBudgetCategory updates the state', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setBudgetCategory('platform')
    })
    expect(result.current.budgetCategory).toBe('platform')
  })

  it('persists search change to localStorage', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setSearch('saved query')
    })
    expect(filterStore.search).toBe('saved query')
  })

  it('persists budgetAssignmentFilter change to localStorage', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setBudgetAssignmentFilter('assigned')
    })
    expect(filterStore.budget_assignment).toBe('assigned')
  })

  it('persists budgetCategory change to localStorage', () => {
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setBudgetCategory('platform')
    })
    expect(filterStore.budget_category).toBe('platform')
  })

  it('clearing search does not leave stale value in localStorage', () => {
    Object.assign(filterStore, { search: 'foo' })
    const { result } = renderHook(() => useProjectsFilters())
    act(() => {
      result.current.setSearch('')
    })
    expect(filterStore.search).toBeUndefined()
  })

  it('unknown value for budgetAssignmentFilter falls back to "all"', () => {
    Object.assign(filterStore, { budget_assignment: 'bogus' })
    const { result } = renderHook(() => useProjectsFilters())
    expect(result.current.budgetAssignmentFilter).toBe('all')
  })
})
