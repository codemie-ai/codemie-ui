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

import { describe, expect, it } from 'vitest'

import { getProviderFieldInitialValue, hasProviderEnumOptions } from '../constants'

describe('hasProviderEnumOptions', () => {
  it('returns true when enum has values', () => {
    expect(hasProviderEnumOptions({ enum: ['0.0', '0.5'] })).toBe(true)
  })

  it('returns false when enum is empty or missing', () => {
    expect(hasProviderEnumOptions({ enum: [] })).toBe(false)
    expect(hasProviderEnumOptions({ enum: null })).toBe(false)
    expect(hasProviderEnumOptions({})).toBe(false)
  })
})

describe('getProviderFieldInitialValue', () => {
  it('prefers default_value for enum fields', () => {
    expect(
      getProviderFieldInitialValue({
        enum: ['0.0', '0.3', '0.5'],
        default_value: '0.3',
      })
    ).toBe('0.3')
  })

  it('falls back to first enum option when default_value is absent', () => {
    expect(
      getProviderFieldInitialValue({
        enum: ['0.0', '0.5'],
      })
    ).toBe('0.0')
  })

  it('uses default_value for non-enum fields', () => {
    expect(
      getProviderFieldInitialValue({
        default_value: '3',
      })
    ).toBe('3')
  })

  it('returns undefined when no default or enum is available', () => {
    expect(getProviderFieldInitialValue({})).toBeUndefined()
    expect(getProviderFieldInitialValue({ default_value: '' })).toBeUndefined()
  })
})
