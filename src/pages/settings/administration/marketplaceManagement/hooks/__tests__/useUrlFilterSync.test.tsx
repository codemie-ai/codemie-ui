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
import { FC, ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildSearch, useUrlFilterSync } from '../useUrlFilterSync'

describe('buildSearch', () => {
  const OWNED = ['a', 'b'] as const

  it('replaces owned keys and drops empty values', () => {
    expect(buildSearch('a=old&b=old', OWNED, { a: 'new', b: '' })).toBe('a=new')
    expect(buildSearch('a=old', OWNED, { a: false, b: null })).toBe('')
  })

  it('keeps params owned by other features', () => {
    expect(buildSearch('assistant=42&a=old', OWNED, { a: 'new' })).toBe('assistant=42&a=new')
  })
})

describe('useUrlFilterSync', () => {
  const wrapper: FC<{ children: ReactNode }> = ({ children }) => (
    <MemoryRouter initialEntries={['/x?keep=1']}>{children}</MemoryRouter>
  )

  const renderSync = () =>
    renderHook(() => ({ sync: useUrlFilterSync(), location: useLocation() }), { wrapper })

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('acceptUrl is true once per distinct URL', () => {
    const { result } = renderSync()
    expect(result.current.sync.acceptUrl('a=1')).toBe(true)
    expect(result.current.sync.acceptUrl('a=1')).toBe(false)
    expect(result.current.sync.acceptUrl('a=2')).toBe(true)
  })

  it('write replaces the query, and skips one identical to the last synced', () => {
    const { result } = renderSync()
    act(() => result.current.sync.write('keep=1&a=1'))
    expect(result.current.location.search).toBe('?keep=1&a=1')
    expect(result.current.location.key).not.toBe('default')

    result.current.sync.acceptUrl('keep=1&a=2')
    const { key } = result.current.location
    act(() => result.current.sync.write('keep=1&a=2'))
    expect(result.current.location.key).toBe(key)
    expect(result.current.location.search).toBe('?keep=1&a=1')
  })

  it('writeDebounced coalesces rapid calls into the last one', () => {
    const { result } = renderSync()
    const first = vi.fn(() => 'keep=1&a=1')
    const last = vi.fn(() => 'keep=1&a=3')
    act(() => {
      result.current.sync.writeDebounced(first, 300)
      vi.advanceTimersByTime(200)
      result.current.sync.writeDebounced(last, 300)
      vi.advanceTimersByTime(299)
    })
    expect(last).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(first).not.toHaveBeenCalled()
    expect(last).toHaveBeenCalledTimes(1)
    expect(result.current.location.search).toBe('?keep=1&a=3')
  })

  it('writeDebounced is cancelled on unmount', () => {
    const { result, unmount } = renderSync()
    const compute = vi.fn(() => 'a=1')
    act(() => result.current.sync.writeDebounced(compute, 300))
    unmount()
    vi.advanceTimersByTime(1000)
    expect(compute).not.toHaveBeenCalled()
  })
})
