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

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CHECK_LABEL } from '../../../MarketplaceOverviewPage'
import { TIER_OPTIONS } from '../MarketplaceCleanupFilters'
import ReasonChip, { REASON_LABEL, bucketReasonLabel, humanizeBucketReason } from '../ReasonChip'

vi.mock('@/utils/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ json: async () => ({}) }), post: vi.fn() },
}))

/**
 * The backend's `CleanupReason` enum
 * (`validator/models.py`) — the ONLY reason codes any response can carry.
 */
const CLEANUP_REASONS = [
  'duplicate',
  'purpose_duplicate',
  'semantic_clone',
  'invalid',
  'dead',
] as const

/** The backend's `UsageTier` enum — note the absence of COOL. */
const USAGE_TIERS = ['HOT', 'WARM', 'COLD', 'DEAD'] as const

/** Every `rule=` literal emitted by `validator/gates.py`. */
const GATE_RULE_IDS = [
  'name_length',
  'name_not_banned',
  'description_length',
  'description_not_equal_name',
  'system_prompt_length',
  'at_least_one_category',
  'substance',
  'no_inline_credentials',
  'credential_scan_timeout',
] as const

describe('ReasonChip', () => {
  it('labels every CleanupReason and nothing else', () => {
    // Every real reason renders a human label, not a raw slug.
    CLEANUP_REASONS.forEach((reason) => {
      const { unmount } = render(<ReasonChip reason={reason} />)
      const text = screen.getByText((c) => c.length > 0).textContent ?? ''
      expect(text, `${reason} must render a label`).not.toBe(reason)
      expect(text, `${reason} must not leak an underscore`).not.toMatch(/_/)
      unmount()
    })

    // …and the map invents nothing the engine cannot emit.
    expect([...Object.keys(REASON_LABEL)].sort((a, b) => a.localeCompare(b))).toEqual(
      [...CLEANUP_REASONS].sort((a, b) => a.localeCompare(b))
    )
  })

  it('omits COOL from the tier vocabulary', () => {
    const values = TIER_OPTIONS.map((o) => o.value).filter((v) => v !== '')
    expect(values).not.toContain('COOL')
    expect([...values].sort((a, b) => String(a).localeCompare(String(b)))).toEqual(
      [...USAGE_TIERS].sort((a, b) => a.localeCompare(b))
    )
  })

  it('labels every real gate rule id', () => {
    GATE_RULE_IDS.forEach((rule) => {
      expect(CHECK_LABEL[rule], `missing label for ${rule}`).toBeTruthy()
    })
    expect([...Object.keys(CHECK_LABEL)].sort((a, b) => a.localeCompare(b))).toEqual(
      [...GATE_RULE_IDS].sort((a, b) => a.localeCompare(b))
    )
  })

  it('renders only the prefix of a composite bucket_reason slug', () => {
    expect(bucketReasonLabel('hot_but_thin:desc<100')).toBe('Hot but thin')
    expect(bucketReasonLabel('warm_polish_gaps:desc<250,cats<2,no_icon,starters<2')).toBe(
      'Warm polish gaps'
    )
    expect(bucketReasonLabel('hot_adoption')).toBe('Hot adoption')
  })

  describe('humanizeBucketReason', () => {
    it('translates a multi-predicate slug to plain-English phrases', () => {
      expect(humanizeBucketReason('warm_polish_gaps:cats<2,no_icon')).toBe(
        'Warm polish gaps — fewer than 2 categories, no icon set'
      )
      expect(humanizeBucketReason('warm_polish_gaps:desc<250,cats<2,no_icon,starters<2')).toBe(
        'Warm polish gaps — description is under 250 characters, fewer than 2 categories, no icon set, fewer than 2 conversation starters'
      )
    })

    it('translates a single-predicate slug', () => {
      expect(humanizeBucketReason('hot_but_thin:desc<100')).toBe(
        'Hot but thin — description is under 100 characters'
      )
      expect(humanizeBucketReason('cold_broken:prompt<200')).toBe(
        'Cold broken — system prompt is under 200 characters'
      )
    })

    it('returns an explanation with live thresholds for the Qualified-bucket bare slugs', () => {
      const thresholds = { hotMinUsers: 50, warmMinUsers: 6, coldMinUsers: 2 }
      expect(humanizeBucketReason('hot_adoption', thresholds)).toBe(
        'Hot adoption — high adoption 50+ users (Hot tier) with all core and polish checks passed'
      )
      expect(humanizeBucketReason('warm_qualified', thresholds)).toBe(
        'Warm qualified — active usage 6–50 users (Warm tier) with at most one minor polish gap'
      )
      expect(humanizeBucketReason('cold_full_polish', thresholds)).toBe(
        'Cold full polish — low usage 2–6 users (Cold tier) with all core and polish checks passed'
      )
    })

    it('falls back to "?" for the Qualified-bucket slugs before the audit config has loaded', () => {
      expect(humanizeBucketReason('hot_adoption')).toBe(
        'Hot adoption — high adoption ?+ users (Hot tier) with all core and polish checks passed'
      )
      expect(humanizeBucketReason('warm_qualified')).toBe(
        'Warm qualified — active usage ?–? users (Warm tier) with at most one minor polish gap'
      )
      expect(humanizeBucketReason('cold_full_polish')).toBe(
        'Cold full polish — low usage ?–? users (Cold tier) with all core and polish checks passed'
      )
    })

    it('returns an explanation for a bare slug whose label alone is not clear, matching the "Label — clause" style', () => {
      expect(humanizeBucketReason('dead_new', { coldMinUsers: 2, archiveDeadAfterDays: 90 })).toBe(
        'Dead new — usage under 2 users (Cold tier min.), but still inside the 90-day (Dead grace period) window'
      )
      expect(
        humanizeBucketReason('dead_zero_signal', { coldMinUsers: 2, archiveDeadAfterDays: 90 })
      ).toBe(
        'Dead zero signal — usage under 2 users (Cold tier min.) and inactive for more than 90 days (Dead grace period)'
      )
      expect(humanizeBucketReason('grace_fail', { warmMinUsers: 6, graceDays: 30 })).toBe(
        'Grace fail — usage never grew past 6 users (Warm tier min.) during the 30-day (Cold grace period)'
      )
    })

    it('falls back to "?" for threshold-based clauses before the audit config has loaded', () => {
      expect(humanizeBucketReason('grace_fail')).toBe(
        'Grace fail — usage never grew past ? users (Warm tier min.) during the ?-day (Cold grace period)'
      )
      expect(humanizeBucketReason('dead_new')).toBe(
        'Dead new — usage under ? users (Cold tier min.), but still inside the ?-day (Dead grace period) window'
      )
      expect(humanizeBucketReason('dead_zero_signal')).toBe(
        'Dead zero signal — usage under ? users (Cold tier min.) and inactive for more than ? days (Dead grace period)'
      )
    })
  })
})
