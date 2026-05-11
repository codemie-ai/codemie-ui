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

import useSearchHistory from '../useSearchHistory'

// Mock userStore
vi.mock('@/store/user', () => ({
  userStore: {
    user: { userId: 'test-user-123' },
  },
}))

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useSearchHistory())

    expect(result.current.history).toEqual([])
  })

  it('should add query to history', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('admin dashboard')
    })

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].value).toBe('admin dashboard')
    expect(typeof result.current.history[0].searchedAt).toBe('string')
    expect(new Date(result.current.history[0].searchedAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('should deduplicate queries', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('admin')
      result.current.addToHistory('project')
      result.current.addToHistory('admin') // duplicate
    })

    expect(result.current.history).toHaveLength(2)
    expect(result.current.history[0].value).toBe('admin') // moved to top
    expect(result.current.history[1].value).toBe('project')
  })

  it('should limit history to 5 items', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      for (let i = 1; i <= 6; i += 1) {
        result.current.addToHistory(`query ${i}`)
      }
    })

    expect(result.current.history).toHaveLength(5)
    expect(result.current.history[0].value).toBe('query 6')
    expect(result.current.history[4].value).toBe('query 2')
  })

  it('should persist history to localStorage', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('test query')
    })

    const stored = localStorage.getItem('test-user-123_chat_search_history')
    expect(stored).toBeTruthy()

    const parsed = JSON.parse(stored!)
    expect(parsed[0].value).toBe('test query')
  })

  it('should load history from localStorage on mount', () => {
    localStorage.setItem(
      'test-user-123_chat_search_history',
      JSON.stringify([{ value: 'existing query', searchedAt: new Date().toISOString() }])
    )

    const { result } = renderHook(() => useSearchHistory())

    expect(result.current.history).toHaveLength(1)
    expect(result.current.history[0].value).toBe('existing query')
  })

  it('should clear history', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('test')
      result.current.clearHistory()
    })

    expect(result.current.history).toEqual([])
    expect(localStorage.getItem('test-user-123_chat_search_history')).toBeNull()
  })

  it('should ignore queries shorter than 3 characters', () => {
    const { result } = renderHook(() => useSearchHistory())

    act(() => {
      result.current.addToHistory('ab')
    })

    expect(result.current.history).toEqual([])
  })
})
