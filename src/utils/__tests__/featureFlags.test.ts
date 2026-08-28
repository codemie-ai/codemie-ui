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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { FEATURE_FLAGS } from '@/constants'
import { appInfoStore } from '@/store/appInfo'

import { isUserManagementEnabled, isBudgetManagementEnabled, isTeamsEnabled } from '../featureFlags'

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    configs: [],
    isConfigFetched: false,
  },
}))

describe('isUserManagementEnabled', () => {
  beforeEach(() => {
    vi.mocked(appInfoStore).configs = []
    vi.mocked(appInfoStore).isConfigFetched = false
  })

  it('should return true when features:userManagement is enabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: 'features:userManagement', settings: { enabled: true } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isUserManagementEnabled()

    expect(result).toBe(true)
  })

  it('should return false when features:userManagement is disabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: 'features:userManagement', settings: { enabled: false } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isUserManagementEnabled()

    expect(result).toBe(false)
  })

  it('should return false when config not fetched', () => {
    vi.mocked(appInfoStore).isConfigFetched = false

    const result = isUserManagementEnabled()

    expect(result).toBe(false)
  })
})

describe('isBudgetManagementEnabled', () => {
  beforeEach(() => {
    vi.mocked(appInfoStore).configs = []
    vi.mocked(appInfoStore).isConfigFetched = false
  })

  it('should return true when features:budgetManagement is enabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: 'features:budgetManagement', settings: { enabled: true } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isBudgetManagementEnabled()

    expect(result).toBe(true)
  })

  it('should return false when features:budgetManagement is disabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: 'features:budgetManagement', settings: { enabled: false } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isBudgetManagementEnabled()

    expect(result).toBe(false)
  })

  it('should return false when config not fetched', () => {
    vi.mocked(appInfoStore).isConfigFetched = false

    const result = isBudgetManagementEnabled()

    expect(result).toBe(false)
  })
})

describe('FEATURE_FLAGS.SUB_WORKFLOW', () => {
  it('has value features:subWorkflow', () => {
    expect(FEATURE_FLAGS.SUB_WORKFLOW).toBe('features:subWorkflow')
  })
})

describe('isTeamsEnabled', () => {
  beforeEach(() => {
    vi.mocked(appInfoStore).configs = []
    vi.mocked(appInfoStore).isConfigFetched = false
  })

  it('should return true when feature flag is enabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: FEATURE_FLAGS.TEAMS_BOT_INTEGRATION, settings: { enabled: true } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isTeamsEnabled()

    expect(result).toBe(true)
  })

  it('should return false when feature flag is disabled', () => {
    vi.mocked(appInfoStore).configs = [
      { id: FEATURE_FLAGS.TEAMS_BOT_INTEGRATION, settings: { enabled: false } },
    ]
    vi.mocked(appInfoStore).isConfigFetched = true

    const result = isTeamsEnabled()

    expect(result).toBe(false)
  })

  it('should return false when config not fetched', () => {
    vi.mocked(appInfoStore).isConfigFetched = false

    const result = isTeamsEnabled()

    expect(result).toBe(false)
  })
})
