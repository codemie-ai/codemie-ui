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

/**
 * Typed accessors for the captured marketplace-management payloads.
 *
 * The JSON next to this file is recorded verbatim from a live backend by
 * `npm run fixtures:refresh` — see README.md. Nothing here invents a field: if a property
 * is missing from a fixture, the endpoint really does not emit it, and a test
 * asserting otherwise is telling the truth about a defect (F-44).
 */

import type {
  CleanupResponse,
  EntityPromptResponse,
  EntityReviewDetail,
  FacetsResponse,
  OverviewResponse,
  PendingResponse,
  CleanupRow,
} from '@/types/generated/marketplaceManagement'

import cleanupDeleteJson from './cleanup-delete.json'
import cleanupDuplicateJson from './cleanup-duplicate.json'
import cleanupVerifiedJson from './cleanup-verified.json'
import entityDetailSimilarJson from './entity-detail-similar.json'
import entityDetailJson from './entity-detail.json'
import entityPromptJson from './entity-prompt.json'
import facetsJson from './facets.json'
import overviewJson from './overview.json'
import pendingSeededJson from './pending-seeded.json'
import pendingJson from './pending.json'

/** GET /overview */
export const overviewFixture = overviewJson as unknown as OverviewResponse

/** GET /facets */
export const facetsFixture = facetsJson as unknown as FacetsResponse

/** GET /cleanup?bucket=DELETE — the queue's default view. */
export const cleanupDeleteFixture = cleanupDeleteJson as unknown as CleanupResponse

/** GET /cleanup?bucket=DELETE&reason=duplicate — the only row with a canonical. */
export const cleanupDuplicateFixture = cleanupDuplicateJson as unknown as CleanupResponse

/** GET /cleanup?bucket=VERIFIED — the rows with real adoption (and likes). */
export const cleanupVerifiedFixture = cleanupVerifiedJson as unknown as CleanupResponse

/** GET /pending — the queue AT REST, legitimately empty (see README.md). */
export const pendingFixture = pendingJson as unknown as PendingResponse

/**
 * GET /pending with one real submission in it.
 *
 * `pendingFixture` above is the queue at rest and therefore carries no row, so
 * it can prove nothing about a `PendingRow`. This one was captured from a
 * submission the refresh script published through the real endpoint with
 * `MARKETPLACE_APPROVAL_GATE_ENABLED` armed, then deleted again — so the row is
 * the backend's own output for a genuine PENDING_REVIEW entity, not an
 * invention (F-31, F-44).
 *
 * Note the contract F-94 settled: the row spells the timestamp `submitted_at`
 * and it is an **epoch float in seconds** — `MarketplacePendingPage` does
 * `new Date(item.submitted_at * 1000)`. There is no `submitted_ts`.
 */
export const pendingSeededFixture = pendingSeededJson as unknown as PendingResponse

/**
 * GET /entities/assistants/{eid} — the 35-key `EntityReviewDetail` projection
 * introduced by EXECUTION-PLAN 8.1. It is NOT an `Assistant`: there is no
 * `system_prompt`, no `toolkits` and no `mcp_servers` (they leaked credentials
 * to every admin and maintainer), only names, counts and gate findings.
 *
 * Captured from a row that was put into `PENDING_REVIEW` for the capture and
 * removed again, because the live corpus contains no pending submission while
 * `MARKETPLACE_APPROVAL_GATE_ENABLED` ships off (F-01). Every value below is
 * the backend's own output for that row — see README.md.
 */
export const entityDetailFixture = entityDetailJson as unknown as EntityReviewDetail

/**
 * The same projection for an entity the audit flagged: three CRITICAL gate
 * findings and a populated `top_similar` pair. The pending fixture above
 * cannot carry `top_similar` — similarity is written by an audit pass, which
 * has never seen a freshly created row.
 */
export const entityDetailSimilarFixture = entityDetailSimilarJson as unknown as EntityReviewDetail

/**
 * GET /entities/assistants/{eid}/prompt — the separately audited route that
 * carries the one field the review projection deliberately omits.
 */
export const entityPromptFixture = entityPromptJson as unknown as EntityPromptResponse

/**
 * EntityReviewDetail for an assistant that has a serveable audit verdict.
 *
 * Used by AssistantDetailsDrawer tests to exercise the Decision section
 * introduced in EPMCDME-15056. All four verdict fields are populated so both
 * the label and the detail text can be asserted.
 */
export const entityDetailWithVerdictFixture: EntityReviewDetail = {
  ...(entityDetailJson as unknown as EntityReviewDetail),
  verdict_kind: 'CANDIDATE_FOR_CLEANUP',
  cleanup_reason: 'duplicate',
  bucket: 'DELETE',
  decision_detail: 'Near-duplicate of Foo Bot (42u vs 3u)',
  bucket_reason: 'similarity_too_high',
  usage_tier: 'COLD',
  polish_check_results: [
    { check: 'description', passed: true, threshold: 250 },
    { check: 'categories', passed: false, threshold: 1 },
    { check: 'icon', passed: true, threshold: true },
    { check: 'starters', passed: false, threshold: 1 },
  ],
}

/** First row of a captured cleanup slice, as the store would hold it. */
export const firstCleanupRow = (payload: CleanupResponse): CleanupRow => {
  const row = payload.items[0]
  if (!row) {
    throw new Error('captured cleanup fixture has no rows — re-run npm run fixtures:refresh')
  }
  return row
}
