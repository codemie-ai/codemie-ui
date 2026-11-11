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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { responseReadyStore } from '@/store/responseReady'

import { useResponseReadyTab } from '../useResponseReadyTab'

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useResponseReadyTab', () => {
  beforeEach(() => {
    responseReadyStore.pending = true
  })

  afterEach(() => {
    setVisibility('visible')
  })

  it('clears pending when the tab becomes visible', () => {
    const { unmount } = renderHook(() => useResponseReadyTab())
    act(() => setVisibility('visible'))
    expect(responseReadyStore.pending).toBe(false)
    unmount()
  })

  it('keeps pending while the tab is hidden', () => {
    const { unmount } = renderHook(() => useResponseReadyTab())
    act(() => setVisibility('hidden'))
    expect(responseReadyStore.pending).toBe(true)
    unmount()
  })

  it('removes its listener on unmount', () => {
    const { unmount } = renderHook(() => useResponseReadyTab())
    unmount()
    act(() => setVisibility('visible'))
    expect(responseReadyStore.pending).toBe(true)
  })
})
