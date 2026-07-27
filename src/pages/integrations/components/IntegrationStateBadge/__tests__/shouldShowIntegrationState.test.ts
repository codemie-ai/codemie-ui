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

import { describe, it, expect } from 'vitest'

import { shouldShowIntegrationState } from '../shouldShowIntegrationState'

describe('shouldShowIntegrationState', () => {
  it('returns true for Scheduler even when is_enabled is absent', () => {
    expect(
      shouldShowIntegrationState({
        credential_type: 'Scheduler',
        credential_values: [{ key: 'url', value: 'https://example.com' }],
      })
    ).toBe(true)
  })

  it('returns true for lowercase scheduler', () => {
    expect(
      shouldShowIntegrationState({
        credential_type: 'scheduler',
        credential_values: [],
      })
    ).toBe(true)
  })

  it('returns false for non-scheduler without is_enabled', () => {
    expect(
      shouldShowIntegrationState({
        credential_type: 'GitHub',
        credential_values: [{ key: 'url', value: 'https://github.com' }],
      })
    ).toBe(false)
  })

  it('returns true for non-scheduler when is_enabled is explicitly set', () => {
    expect(
      shouldShowIntegrationState({
        credential_type: 'GitHub',
        credential_values: [{ key: 'is_enabled', value: false }],
      })
    ).toBe(true)
  })
})
