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

import {
  isMarketplaceStatusFilter,
  toBackendStatus,
  MARKETPLACE_STATUS_FILTERS,
} from '../filterVocabulary'

describe('MarketplaceStatusFilter vocabulary', () => {
  it('isMarketplaceStatusFilter accepts VERIFIED', () => {
    expect(isMarketplaceStatusFilter('VERIFIED')).toBe(true)
  })

  it('isMarketplaceStatusFilter rejects APPROVED', () => {
    expect(isMarketplaceStatusFilter('APPROVED')).toBe(false)
  })

  it('toBackendStatus returns undefined for ALL', () => {
    expect(toBackendStatus('ALL')).toBeUndefined()
  })

  it('toBackendStatus passes VERIFIED through unchanged', () => {
    // GET /marketplace-assistants takes the UI vocabulary directly and 422s
    // on internal values like APPROVED (measured against the live backend).
    expect(toBackendStatus('VERIFIED')).toBe('VERIFIED')
  })

  it('toBackendStatus passes PENDING through unchanged', () => {
    expect(toBackendStatus('PENDING')).toBe('PENDING')
  })

  it('toBackendStatus returns REJECTED for REJECTED', () => {
    expect(toBackendStatus('REJECTED')).toBe('REJECTED')
  })

  it('all MARKETPLACE_STATUS_FILTERS members pass isMarketplaceStatusFilter', () => {
    Object.keys(MARKETPLACE_STATUS_FILTERS).forEach((status) => {
      expect(isMarketplaceStatusFilter(status)).toBe(true)
    })
  })
})
