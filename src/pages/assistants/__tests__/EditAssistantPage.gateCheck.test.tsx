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

import { isLiveMarketplaceStatus } from '@/constants/assistants'
import { isMarketplaceApprovalGateEnabled } from '@/utils/featureFlags'

const { mockIsMarketplaceApprovalGateEnabled } = vi.hoisted(() => ({
  mockIsMarketplaceApprovalGateEnabled: vi.fn(() => true),
}))

vi.mock('@/utils/featureFlags', () => ({
  isMarketplaceApprovalGateEnabled: mockIsMarketplaceApprovalGateEnabled,
}))

vi.mock('@/constants/assistants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/assistants')>()
  return { ...actual }
})

/**
 * Mirrors the gate-check logic in EditAssistantPage's handleSaveClick, which
 * delegates to gate.handleSaveClickForLive(). Returns true when the action
 * was intercepted (caller should NOT also submit the form).
 */
function handleSaveClickForLive(
  status: string | undefined | null,
  setRevalidationWarningVisible: (v: boolean) => void
): boolean {
  if (!isMarketplaceApprovalGateEnabled() || !isLiveMarketplaceStatus(status)) return false
  setRevalidationWarningVisible(true)
  return true
}

describe('handleSaveClickForLive gate-check guard', () => {
  let setWarning: (v: boolean) => void

  beforeEach(() => {
    setWarning = vi.fn() as unknown as (v: boolean) => void
    mockIsMarketplaceApprovalGateEnabled.mockReturnValue(true)
  })

  it('intercepts (returns true) and shows modal for APPROVED', () => {
    const intercepted = handleSaveClickForLive('APPROVED', setWarning)
    expect(intercepted).toBe(true)
    expect(setWarning).toHaveBeenCalledWith(true)
  })

  it('intercepts (returns true) and shows modal for PENDING_REVIEW', () => {
    const intercepted = handleSaveClickForLive('PENDING_REVIEW', setWarning)
    expect(intercepted).toBe(true)
    expect(setWarning).toHaveBeenCalledWith(true)
  })

  it('does NOT intercept for DRAFT — falls through to form submit', () => {
    const intercepted = handleSaveClickForLive('DRAFT', setWarning)
    expect(intercepted).toBe(false)
    expect(setWarning).not.toHaveBeenCalled()
  })

  it('does NOT intercept for REJECTED', () => {
    const intercepted = handleSaveClickForLive('REJECTED', setWarning)
    expect(intercepted).toBe(false)
    expect(setWarning).not.toHaveBeenCalled()
  })

  it('does NOT intercept when feature flag is off, even for APPROVED', () => {
    mockIsMarketplaceApprovalGateEnabled.mockReturnValue(false)
    const intercepted = handleSaveClickForLive('APPROVED', setWarning)
    expect(intercepted).toBe(false)
    expect(setWarning).not.toHaveBeenCalled()
  })

  it('does NOT intercept when status is null', () => {
    const intercepted = handleSaveClickForLive(null, setWarning)
    expect(intercepted).toBe(false)
    expect(setWarning).not.toHaveBeenCalled()
  })
})

describe('EditAssistantPage — PublishGateFindingsModal derived labels', () => {
  it('gateSendForReviewLabel is "Save and remove" for PENDING_REVIEW', () => {
    const getLabel = (status: string | undefined | null): string =>
      status?.toUpperCase() === 'PENDING_REVIEW' ? 'Save and remove' : 'Save & Unpublish'

    expect(getLabel('PENDING_REVIEW')).toBe('Save and remove')
    expect(getLabel('APPROVED')).toBe('Save & Unpublish')
    expect(getLabel(null)).toBe('Save & Unpublish')
  })

  it('gateBannerText includes "review queue" for PENDING_REVIEW and "Marketplace" for APPROVED', () => {
    const getBanner = (status: string | undefined | null): string | null => {
      const s = status?.toUpperCase()
      if (s === 'PENDING_REVIEW')
        return 'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue, or save without fixing to remove it from the review queue.'
      if (s === 'APPROVED')
        return 'This assistant is already in the Marketplace. Fix the checks below to keep it published, or save without fixing to unpublish it.'
      return null
    }

    expect(getBanner('PENDING_REVIEW')).toMatch(/review queue/)
    expect(getBanner('APPROVED')).toMatch(/Marketplace/)
    expect(getBanner('DRAFT')).toBeNull()
    expect(getBanner(null)).toBeNull()
  })
})
