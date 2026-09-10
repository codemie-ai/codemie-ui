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
import { describe, expect, it } from 'vitest'

import { useSessionModal } from '../useSessionModal'

describe('useSessionModal', () => {
  it('starts with null selectedTraceId', () => {
    const { result } = renderHook(() => useSessionModal())
    expect(result.current.selectedTraceId).toBeNull()
  })

  it('selectSession sets selectedTraceId', () => {
    const { result } = renderHook(() => useSessionModal())
    act(() => result.current.selectSession('trace-123'))
    expect(result.current.selectedTraceId).toBe('trace-123')
  })

  it('closeSession resets selectedTraceId to null', () => {
    const { result } = renderHook(() => useSessionModal())
    act(() => result.current.selectSession('trace-123'))
    act(() => result.current.closeSession())
    expect(result.current.selectedTraceId).toBeNull()
  })

  it('selectSession and closeSession have stable references across renders', () => {
    const { result, rerender } = renderHook(() => useSessionModal())
    const { selectSession: s1, closeSession: c1 } = result.current
    rerender()
    expect(result.current.selectSession).toBe(s1)
    expect(result.current.closeSession).toBe(c1)
  })
})
