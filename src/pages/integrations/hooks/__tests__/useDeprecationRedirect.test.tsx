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

import { useDeprecationRedirect } from '../useDeprecationRedirect'

const navigateBackMock = vi.fn()
vi.mock('@/utils/helpers', () => ({
  navigateBack: (...args: unknown[]) => navigateBackMock(...args),
}))

const isDeprecatedMock = vi.fn()
vi.mock('@/utils/settings', () => ({
  isDeprecatedCredentialType: (t: unknown) => isDeprecatedMock(t),
}))

describe('useDeprecationRedirect', () => {
  beforeEach(() => {
    navigateBackMock.mockReset()
    isDeprecatedMock.mockReset()
  })

  it('returns true and calls navigateBack when the type is deprecated', () => {
    isDeprecatedMock.mockReturnValue(true)
    const { result } = renderHook(() => useDeprecationRedirect('ZephyrSquad'))
    expect(result.current).toBe(true)
    expect(navigateBackMock).toHaveBeenCalledTimes(1)
  })

  it('returns false and does not navigate for a non-deprecated type', () => {
    isDeprecatedMock.mockReturnValue(false)
    const { result } = renderHook(() => useDeprecationRedirect('Jira'))
    expect(result.current).toBe(false)
    expect(navigateBackMock).not.toHaveBeenCalled()
  })

  it('handles undefined credential type without navigating', () => {
    isDeprecatedMock.mockReturnValue(false)
    const { result } = renderHook(() => useDeprecationRedirect(undefined))
    expect(result.current).toBe(false)
    expect(navigateBackMock).not.toHaveBeenCalled()
  })
})
