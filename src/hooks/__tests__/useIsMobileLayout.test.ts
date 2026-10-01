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
import { afterEach, describe, expect, it } from 'vitest'

import { matchesMobileLayout, useIsMobileLayout } from '@/hooks/useIsMobileLayout'
import { mockMobileLayout } from '@/test-utils/mobileLayout'

describe('useIsMobileLayout', () => {
  let restoreLayout = () => {}

  afterEach(() => {
    cleanup()
    restoreLayout()
  })

  it('reports the desktop layout at desktop widths', () => {
    const { result } = renderHook(() => useIsMobileLayout())

    expect(result.current).toBe(false)
    expect(matchesMobileLayout()).toBe(false)
  })

  it('reports the mobile layout below the lg breakpoint', () => {
    restoreLayout = mockMobileLayout().restore

    const { result } = renderHook(() => useIsMobileLayout())

    expect(result.current).toBe(true)
    expect(matchesMobileLayout()).toBe(true)
  })

  it('follows the viewport when it crosses the breakpoint', () => {
    const layout = mockMobileLayout()
    restoreLayout = layout.restore
    const { result } = renderHook(() => useIsMobileLayout())

    act(() => layout.setMobile(false))
    expect(result.current).toBe(false)

    act(() => layout.setMobile(true))
    expect(result.current).toBe(true)
  })

  it('falls back to the desktop layout when matchMedia is unavailable', () => {
    const { matchMedia } = window
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined })

    try {
      expect(matchesMobileLayout()).toBe(false)
    } finally {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMedia })
    }
  })
})
