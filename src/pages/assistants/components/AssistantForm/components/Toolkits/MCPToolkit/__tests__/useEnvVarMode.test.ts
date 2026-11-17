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
import { describe, expect, it, vi } from 'vitest'

import { useEnvVarMode } from '../MCPToolkitForm/useEnvVarMode'

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: { findUserSetting: vi.fn().mockResolvedValue(undefined) },
}))

const server = {
  name: 'github',
  isFromMarketplace: true,
  required_env_vars: [
    { name: 'A', required: true },
    { name: 'B', required: true },
  ],
} as any

const renderValidated = () => {
  const hook = renderHook(() => useEnvVarMode(server, 'proj'))
  act(() => {
    hook.result.current.validateManualEnvVars()
  })
  return hook
}

describe('useEnvVarMode errors', () => {
  it('clears a field error once that field gets a value', () => {
    const { result } = renderValidated()
    expect(result.current.envVarErrors).toEqual({ A: 'A is required', B: 'B is required' })

    act(() => result.current.setManualEnvVarValues({ A: 'a' }))

    expect(result.current.envVarErrors).toEqual({ B: 'B is required' })
  })

  it('keeps a field error while the value is blank', () => {
    const { result } = renderValidated()

    act(() => result.current.setManualEnvVarValues({ A: '   ' }))

    expect(result.current.envVarErrors).toEqual({ A: 'A is required', B: 'B is required' })
  })

  it('does not add errors while typing before validation', () => {
    const { result } = renderHook(() => useEnvVarMode(server, 'proj'))

    act(() => result.current.setManualEnvVarValues({ A: '' }))

    expect(result.current.envVarErrors).toEqual({})
  })
})
