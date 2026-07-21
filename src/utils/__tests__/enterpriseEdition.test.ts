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

import { isEnterpriseEdition } from '../enterpriseEdition'
import * as featureFlags from '../featureFlags'

vi.mock('../featureFlags')

describe('isEnterpriseEdition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when features:enterpriseEdition is enabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(true)

    const result = isEnterpriseEdition()

    expect(result).toBe(true)
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('features:enterpriseEdition')
  })

  it('should return false when features:enterpriseEdition is disabled', () => {
    vi.mocked(featureFlags.isFeatureEnabled).mockReturnValue(false)

    const result = isEnterpriseEdition()

    expect(result).toBe(false)
    expect(featureFlags.isFeatureEnabled).toHaveBeenCalledWith('features:enterpriseEdition')
  })
})
