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
import { afterEach, describe, expect, it } from 'vitest'

import { useKatasEnabled } from '@/hooks/useFeatureFlags'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'

const setConfigs = (configs: any[], isConfigFetched = true) => {
  appInfoStore.configs = configs
  appInfoStore.isConfigFetched = isConfigFetched
}

describe('useKatasEnabled', () => {
  afterEach(() => {
    setConfigs([], false)
    userStore.user = null
  })

  it('reads off when there is no features:katas item', () => {
    setConfigs([])
    const { result } = renderHook(() => useKatasEnabled())
    expect(result.current).toEqual([false, true])
  })

  it('reads on when the item is enabled', () => {
    setConfigs([{ id: 'features:katas', settings: { enabled: true } }])
    const { result } = renderHook(() => useKatasEnabled())
    expect(result.current).toEqual([true, true])
  })

  it('reads off for an external user when not available for external', () => {
    userStore.user = { user_type: 'external' } as any
    setConfigs([{ id: 'features:katas', settings: { enabled: true, availableForExternal: false } }])
    const { result } = renderHook(() => useKatasEnabled())
    expect(result.current[0]).toBe(false)
  })
})
