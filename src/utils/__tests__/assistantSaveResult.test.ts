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

import { isLiveMarketplaceStatus, MARKETPLACE_STATUS } from '@/constants/assistants'

import { getAssistantSaveFailureMessage, isAssistantSaveFailed } from '../assistants'

const missingIntegrations = {
  validation: {
    has_missing_integrations: true,
    missing_by_credential_type: [],
    sub_assistants_missing: [],
    message: 'missing',
  },
}

describe('isAssistantSaveFailed', () => {
  it('is false for a plain successful response', () => {
    expect(isAssistantSaveFailed({})).toBe(false)
    expect(
      isAssistantSaveFailed({
        validation: { ...missingIntegrations.validation, has_missing_integrations: false },
      })
    ).toBe(false)
  })

  it('is true when the response carries an error', () => {
    expect(isAssistantSaveFailed({ error: 'boom' })).toBe(true)
  })

  it('is true when a 200 response reports missing integrations (nothing was saved)', () => {
    expect(isAssistantSaveFailed(missingIntegrations)).toBe(true)
  })

  it('is false for a missing result', () => {
    expect(isAssistantSaveFailed(undefined)).toBe(false)
    expect(isAssistantSaveFailed(null)).toBe(false)
  })
})

describe('getAssistantSaveFailureMessage', () => {
  it('names missing integrations when that is the cause', () => {
    expect(getAssistantSaveFailureMessage(missingIntegrations)).toContain(
      'integrations are missing'
    )
  })

  it('falls back to the generic message', () => {
    expect(getAssistantSaveFailureMessage({ error: 'boom' })).toBe(
      'Failed to save assistant. Please try again.'
    )
  })
})

describe('isLiveMarketplaceStatus', () => {
  it('is true for APPROVED and PENDING_REVIEW regardless of case', () => {
    expect(isLiveMarketplaceStatus(MARKETPLACE_STATUS.APPROVED)).toBe(true)
    expect(isLiveMarketplaceStatus('pending_review')).toBe(true)
  })

  it('is false for private and closed statuses', () => {
    expect(isLiveMarketplaceStatus(MARKETPLACE_STATUS.DRAFT)).toBe(false)
    expect(isLiveMarketplaceStatus(MARKETPLACE_STATUS.REJECTED)).toBe(false)
    expect(isLiveMarketplaceStatus(MARKETPLACE_STATUS.WITHDRAWN)).toBe(false)
    expect(isLiveMarketplaceStatus(null)).toBe(false)
    expect(isLiveMarketplaceStatus(undefined)).toBe(false)
  })
})
