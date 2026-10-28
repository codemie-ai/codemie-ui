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

import type { AssistantRow } from '@/store/marketplaceManagement'
import type { EntityReviewDetail } from '@/types/generated/marketplaceManagement'

import {
  getAssistantActions,
  getDrawerActions,
  toAssistantStatusBadgeStatus,
} from '../assistantActions'

describe('assistantActions', () => {
  describe('getAssistantActions', () => {
    it('returns [publish, reject] for PENDING_REVIEW with no CRITICAL findings', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'PENDING_REVIEW',
        is_verified: false,
        gate_findings: [],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual(['publish', 'reject'])
    })

    it('returns [force-publish, reject] for PENDING_REVIEW with CRITICAL findings', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'PENDING_REVIEW',
        is_verified: false,
        gate_findings: [{ severity: 'CRITICAL', rule: 'rule1', message: 'critical issue' }],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual(['force-publish', 'reject'])
    })

    it('returns [] for APPROVED with is_verified=true', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'APPROVED',
        is_verified: true,
        gate_findings: [],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual([])
    })

    it('returns [force-publish] for REJECTED', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'REJECTED',
        is_verified: false,
        gate_findings: [],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual(['force-publish'])
    })

    // EPMCDME-14234, CR-003: WITHDRAWN previously fell through to the final
    // `return []`, leaving an admin no way to get a withdrawn assistant back
    // into the marketplace from this list.
    it('returns [force-publish] for WITHDRAWN, the same way back in as REJECTED', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'WITHDRAWN',
        is_verified: false,
        gate_findings: [],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual(['force-publish'])
    })

    it('returns [] for DRAFT — never submitted, so no action in this vocabulary applies', () => {
      const row: Pick<AssistantRow, 'marketplace_status' | 'is_verified' | 'gate_findings'> = {
        marketplace_status: 'DRAFT',
        is_verified: false,
        gate_findings: [],
      }
      const result = getAssistantActions(row)
      expect(result).toEqual([])
    })
  })

  describe('getDrawerActions', () => {
    it('returns actions from EntityReviewDetail by delegating to getAssistantActions', () => {
      const detail: Pick<
        EntityReviewDetail,
        'marketplace_status' | 'is_verified' | 'gate_findings'
      > = {
        marketplace_status: 'PENDING_REVIEW',
        is_verified: false,
        gate_findings: [],
      }
      const result = getDrawerActions(detail)
      expect(result).toEqual(['publish', 'reject'])
    })

    it('handles undefined gate_findings from EntityReviewDetail', () => {
      const detail: Pick<
        EntityReviewDetail,
        'marketplace_status' | 'is_verified' | 'gate_findings'
      > = {
        marketplace_status: 'PENDING_REVIEW',
        is_verified: false,
        gate_findings: undefined as any,
      }
      const result = getDrawerActions(detail)
      expect(result).toEqual(['publish', 'reject'])
    })
  })

  describe('toAssistantStatusBadgeStatus', () => {
    it('returns "verified" for APPROVED', () => {
      const row: Pick<AssistantRow, 'marketplace_status'> = {
        marketplace_status: 'APPROVED',
      }
      const result = toAssistantStatusBadgeStatus(row)
      expect(result).toBe('verified')
    })

    it('returns "rejected" for REJECTED', () => {
      const row: Pick<AssistantRow, 'marketplace_status'> = {
        marketplace_status: 'REJECTED',
      }
      const result = toAssistantStatusBadgeStatus(row)
      expect(result).toBe('rejected')
    })

    it('returns "pending" for PENDING_REVIEW', () => {
      const row: Pick<AssistantRow, 'marketplace_status'> = {
        marketplace_status: 'PENDING_REVIEW',
      }
      const result = toAssistantStatusBadgeStatus(row)
      expect(result).toBe('pending')
    })

    it('returns "pending" for unknown status', () => {
      const row: Pick<AssistantRow, 'marketplace_status'> = {
        marketplace_status: 'UNKNOWN_STATUS' as never,
      }
      const result = toAssistantStatusBadgeStatus(row)
      expect(result).toBe('pending')
    })
  })
})
