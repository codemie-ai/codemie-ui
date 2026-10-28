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

import { MARKETPLACE_STATUS } from '@/constants/assistants'
import type { AssistantRow } from '@/store/marketplaceManagement'
import type { EntityReviewDetail, MarketplaceStatus } from '@/types/generated/marketplaceManagement'

export type AssistantActionId = 'publish' | 'force-publish' | 'reject' | 'withdraw'

export function getAssistantActions(
  row: Pick<AssistantRow, 'marketplace_status' | 'gate_findings' | 'is_verified'>
): AssistantActionId[] {
  const { marketplace_status, gate_findings, is_verified } = row
  const hasCritical = (gate_findings ?? []).some((f) => f.severity === 'CRITICAL')
  if (marketplace_status === MARKETPLACE_STATUS.APPROVED && is_verified) return []
  if (marketplace_status === MARKETPLACE_STATUS.APPROVED) return ['withdraw']
  if (marketplace_status === MARKETPLACE_STATUS.REJECTED) return ['force-publish']
  if (marketplace_status === MARKETPLACE_STATUS.PENDING_REVIEW)
    return hasCritical ? ['force-publish', 'reject'] : ['publish', 'reject']
  // WITHDRAWN is the same "needs a way back in" state as REJECTED — an admin
  // pulled it off the marketplace, and force-publish is the only vocabulary
  // this page has for putting it back (EPMCDME-14234, CR-003). Previously
  // fell through to the final `return []`, leaving no action reachable.
  if (marketplace_status === MARKETPLACE_STATUS.WITHDRAWN) return ['force-publish']
  // DRAFT has never been submitted for marketplace review, so none of this
  // page's actions (publish/force-publish/reject/withdraw) apply to it —
  // there is no "submit" action in this vocabulary. Falls through to [].
  return []
}

export function getDrawerActions(
  detail: Pick<EntityReviewDetail, 'marketplace_status' | 'gate_findings' | 'is_verified'>
): AssistantActionId[] {
  return getAssistantActions({
    marketplace_status: (detail.marketplace_status as MarketplaceStatus | null) ?? null,
    gate_findings: (detail.gate_findings ?? []) as AssistantRow['gate_findings'],
    is_verified: detail.is_verified ?? false,
  })
}

export function toAssistantStatusBadgeStatus(
  row: Pick<AssistantRow, 'marketplace_status'>
): 'verified' | 'pending' | 'rejected' {
  if (row.marketplace_status === MARKETPLACE_STATUS.APPROVED) return 'verified'
  if (row.marketplace_status === MARKETPLACE_STATUS.REJECTED) return 'rejected'
  return 'pending'
}
