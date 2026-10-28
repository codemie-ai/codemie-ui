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

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SortState } from '@/types/table'

import { useTableFilters } from '../useTableFilters'

afterEach(cleanup)

describe('useTableFilters — default (asc-first) sort cycle', () => {
  it('cycles asc → desc → unsorted on repeated clicks of the same key', () => {
    const { result } = renderHook(() => useTableFilters())

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: 'name', sortOrder: 'asc' })

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: 'name', sortOrder: 'desc' })

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: undefined, sortOrder: undefined })
  })

  it('resets to asc on a different key', () => {
    const { result } = renderHook(() => useTableFilters())

    act(() => result.current.onSort('name'))
    act(() => result.current.onSort('status'))
    expect(result.current.sort).toEqual({ sortKey: 'status', sortOrder: 'asc' })
  })
})

describe('useTableFilters — firstOrderByKey option', () => {
  const firstOrderByKey = (key: string) => (key === 'name' ? 'asc' : 'desc')

  it('cycles asc → desc → unsorted for an asc-first column', () => {
    const { result } = renderHook(() => useTableFilters({ firstOrderByKey }))

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: 'name', sortOrder: 'asc' })

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: 'name', sortOrder: 'desc' })

    act(() => result.current.onSort('name'))
    expect(result.current.sort).toEqual({ sortKey: undefined, sortOrder: undefined })
  })

  it('cycles desc → asc → unsorted for a desc-first column', () => {
    const { result } = renderHook(() => useTableFilters({ firstOrderByKey }))

    act(() => result.current.onSort('users'))
    expect(result.current.sort).toEqual({ sortKey: 'users', sortOrder: 'desc' })

    act(() => result.current.onSort('users'))
    expect(result.current.sort).toEqual({ sortKey: 'users', sortOrder: 'asc' })

    act(() => result.current.onSort('users'))
    expect(result.current.sort).toEqual({ sortKey: undefined, sortOrder: undefined })
  })

  it('starts the correct first direction when switching columns', () => {
    const { result } = renderHook(() => useTableFilters({ firstOrderByKey }))

    act(() => result.current.onSort('name'))
    act(() => result.current.onSort('users'))
    expect(result.current.sort).toEqual({ sortKey: 'users', sortOrder: 'desc' })
  })
})

describe('useTableFilters — controlled sort', () => {
  it('reflects the controlled sort prop immediately', () => {
    const { result, rerender } = renderHook(
      ({ sort }: { sort: SortState }) => useTableFilters({ sort }),
      { initialProps: { sort: { sortKey: 'name', sortOrder: 'asc' } as SortState } }
    )

    expect(result.current.sort).toEqual({ sortKey: 'name', sortOrder: 'asc' })

    rerender({ sort: { sortKey: 'users', sortOrder: 'desc' } })
    expect(result.current.sort).toEqual({ sortKey: 'users', sortOrder: 'desc' })
  })

  it('reflects an empty controlled sort (cleared externally)', () => {
    const { result, rerender } = renderHook(
      ({ sort }: { sort: SortState }) => useTableFilters({ sort }),
      { initialProps: { sort: { sortKey: 'name', sortOrder: 'asc' } as SortState } }
    )

    rerender({ sort: {} })
    expect(result.current.sort).toEqual({})
  })

  it('calls onSortCallback with the computed next sort and does not update internal state', () => {
    const onSortCallback = vi.fn()
    const controlledSort = { sortKey: undefined, sortOrder: undefined }

    const { result } = renderHook(() => useTableFilters({ sort: controlledSort, onSortCallback }))

    act(() => result.current.onSort('name'))

    // Callback receives the computed next sort
    expect(onSortCallback).toHaveBeenCalledWith({ sortKey: 'name', sortOrder: 'asc' })
    // The controlled sort prop drives the returned sort — it stays at the original value
    // until the caller updates the prop
    expect(result.current.sort).toEqual(controlledSort)
  })

  it('uses firstOrderByKey in controlled mode', () => {
    const onSortCallback = vi.fn()
    const firstOrderByKey = (key: string) => (key === 'users' ? 'desc' : 'asc') as 'asc' | 'desc'

    const { result } = renderHook(() =>
      useTableFilters({ sort: {}, firstOrderByKey, onSortCallback })
    )

    act(() => result.current.onSort('users'))
    expect(onSortCallback).toHaveBeenCalledWith({ sortKey: 'users', sortOrder: 'desc' })
  })
})
