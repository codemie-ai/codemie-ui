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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FEATURE_FLAGS } from '@/constants'
import { appInfoStore } from '@/store/appInfo'

import { useMermaidEnabled } from '../useFeatureFlags'

// Return the store as-is so the hook reads the mocked appInfoStore directly.
vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: <T>(store: T): T => store,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    configs: [],
    isConfigFetched: false,
  },
}))

describe('useMermaidEnabled', () => {
  beforeEach(() => {
    vi.mocked(appInfoStore).configs = []
    vi.mocked(appInfoStore).isConfigFetched = false
  })

  it('returns [true, false] when configs are absent and not yet fetched', () => {
    const { result } = renderHook(() => useMermaidEnabled())

    expect(result.current).toEqual([true, false])
  })

  it('returns [true, true] when configs are absent but fetched', () => {
    vi.mocked(appInfoStore).isConfigFetched = true

    const { result } = renderHook(() => useMermaidEnabled())

    expect(result.current).toEqual([true, true])
  })

  it('returns [false, true] when features:mermaid is explicitly disabled', () => {
    vi.mocked(appInfoStore).configs = [{ id: FEATURE_FLAGS.MERMAID, settings: { enabled: false } }]
    vi.mocked(appInfoStore).isConfigFetched = true

    const { result } = renderHook(() => useMermaidEnabled())

    expect(result.current).toEqual([false, true])
  })

  it('returns [true, true] when features:mermaid is explicitly enabled', () => {
    vi.mocked(appInfoStore).configs = [{ id: FEATURE_FLAGS.MERMAID, settings: { enabled: true } }]
    vi.mocked(appInfoStore).isConfigFetched = true

    const { result } = renderHook(() => useMermaidEnabled())

    expect(result.current).toEqual([true, true])
  })
})
