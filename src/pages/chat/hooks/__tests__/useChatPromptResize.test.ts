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

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useChatPromptResize } from '../useChatPromptResize'

const mockOnLayoutChanged = vi.fn()
const mockUseDefaultLayout = vi.fn()

vi.mock('react-resizable-panels', () => ({
  useDefaultLayout: (...args: any[]) => mockUseDefaultLayout(...args),
}))

vi.mock('valtio', () => ({
  useSnapshot: vi.fn((store) => store),
}))

vi.mock('@/store', () => ({
  userStore: { user: { userId: 'user-123' } },
}))

describe('useChatPromptResize', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUseDefaultLayout.mockReturnValue({
      defaultLayout: { 'chat-history': 70, 'chat-prompt': 30 },
      onLayoutChanged: mockOnLayoutChanged,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('calls useDefaultLayout with the correct per-user storage key', () => {
    renderHook(() => useChatPromptResize())
    expect(mockUseDefaultLayout).toHaveBeenCalledWith({
      id: 'chat-prompt-height-user-123',
      storage: localStorage,
    })
  })

  it('returns defaultLayout from useDefaultLayout', () => {
    const { result } = renderHook(() => useChatPromptResize())
    expect(result.current.defaultLayout).toEqual({ 'chat-history': 70, 'chat-prompt': 30 })
  })

  it('returns the resolved userId so callers can key the layout Group on it', () => {
    const { result } = renderHook(() => useChatPromptResize())
    expect(result.current.userId).toBe('user-123')
  })

  it('debounces onLayoutChanged — fires only once after a burst of calls within 300ms', () => {
    const { result } = renderHook(() => useChatPromptResize())

    act(() => {
      result.current.debouncedOnLayoutChanged({ 'chat-history': 60, 'chat-prompt': 40 })
      result.current.debouncedOnLayoutChanged({ 'chat-history': 65, 'chat-prompt': 35 })
      result.current.debouncedOnLayoutChanged({ 'chat-history': 70, 'chat-prompt': 30 })
    })

    expect(mockOnLayoutChanged).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockOnLayoutChanged).toHaveBeenCalledTimes(1)
    expect(mockOnLayoutChanged).toHaveBeenCalledWith({ 'chat-history': 70, 'chat-prompt': 30 })
  })

  it('does not call onLayoutChanged if the component unmounts before 300ms elapses', () => {
    const { result, unmount } = renderHook(() => useChatPromptResize())

    act(() => {
      result.current.debouncedOnLayoutChanged({ 'chat-history': 60, 'chat-prompt': 40 })
    })

    unmount()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(mockOnLayoutChanged).not.toHaveBeenCalled()
  })
})
