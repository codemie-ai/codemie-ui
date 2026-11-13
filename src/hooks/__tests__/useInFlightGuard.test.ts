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
import { describe, it, expect } from 'vitest'

import { useInFlightGuard } from '../useInFlightGuard'

describe('useInFlightGuard', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useInFlightGuard())

    expect(result.current.inFlight).toBe(false)
  })

  it('rejects a second tryBegin in the same tick, before a re-render', () => {
    const { result } = renderHook(() => useInFlightGuard())

    let first: boolean | undefined
    let second: boolean | undefined
    act(() => {
      first = result.current.tryBegin()
      second = result.current.tryBegin()
    })

    expect([first, second]).toEqual([true, false])
    expect(result.current.inFlight).toBe(true)
  })

  it('allows a new attempt after end', () => {
    const { result } = renderHook(() => useInFlightGuard())

    act(() => {
      result.current.tryBegin()
    })
    act(() => {
      result.current.end()
    })
    expect(result.current.inFlight).toBe(false)

    let again: boolean | undefined
    act(() => {
      again = result.current.tryBegin()
    })
    expect(again).toBe(true)
  })
})
