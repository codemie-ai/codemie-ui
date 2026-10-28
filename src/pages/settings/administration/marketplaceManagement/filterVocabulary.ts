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

import type {
  Bucket,
  CleanupReason,
  GateRule,
  UsageTier,
  VerdictKind,
} from '@/types/generated/marketplaceManagement'

/**
 * Runtime vocabularies for the four `GET /cleanup` query parameters the API
 * validates as enums: `bucket`, `reason`, `tier` and `rule`.
 *
 * Since EXECUTION-PLAN 4.2 an unknown value in any of them is a **422**, not a
 * 200 with `total: 0`. Measured against the live backend:
 *
 *   /cleanup?reason=OBSOLETE   422  query.reason: Input should be 'duplicate',
 *                                   'purpose_duplicate', 'semantic_clone',
 *                                   'invalid' or 'dead'
 *   /cleanup?tier=COOL         422  query.tier: Input should be 'HOT', 'WARM',
 *                                   'COLD' or 'DEAD'
 *   /cleanup?rule=made_up_rule 422  query.rule: Input should be 'name_length', …
 *   /cleanup?bucket=NOT_A_BUCKET 422 query.bucket: Input should be 'VERIFIED',
 *                                   'COMMUNITY' or 'DELETE'
 *
 * The generated types are erased at runtime, so a `string` off the URL cannot
 * be checked against them. Each vocabulary below is therefore declared as a
 * `Record<Union, true>` — an object literal typed that way is exhaustive in
 * **both** directions: omitting a member the backend added is a compile error,
 * and inventing one it does not have is too. That is exactly the failure mode
 * F-68 described (nine SCREAMING_SNAKE reason codes that no response could
 * ever contain), made impossible rather than merely fixed.
 */

const BUCKET_SET: Record<Bucket, true> = {
  VERIFIED: true,
  COMMUNITY: true,
  DELETE: true,
}

const CLEANUP_REASON_SET: Record<CleanupReason, true> = {
  duplicate: true,
  purpose_duplicate: true,
  semantic_clone: true,
  invalid: true,
  dead: true,
}

const USAGE_TIER_SET: Record<UsageTier, true> = {
  HOT: true,
  WARM: true,
  COLD: true,
  DEAD: true,
}

const GATE_RULE_SET: Record<GateRule, true> = {
  name_length: true,
  name_not_banned: true,
  description_length: true,
  description_not_equal_name: true,
  system_prompt_length: true,
  at_least_one_category: true,
  substance: true,
  no_inline_credentials: true,
  credential_scan_timeout: true,
}

const VERDICT_KIND_SET: Record<VerdictKind, true> = {
  KEEP: true,
  REVIEW: true,
  CANDIDATE_FOR_CLEANUP: true,
}

export const BUCKETS = Object.keys(BUCKET_SET) as Bucket[]
export const CLEANUP_REASONS = Object.keys(CLEANUP_REASON_SET) as CleanupReason[]
export const USAGE_TIERS = Object.keys(USAGE_TIER_SET) as UsageTier[]
export const GATE_RULES = Object.keys(GATE_RULE_SET) as GateRule[]
export const VERDICT_KINDS = Object.keys(VERDICT_KIND_SET) as VerdictKind[]

export const isBucket = (value: string): value is Bucket => value in BUCKET_SET

export const isCleanupReason = (value: string): value is CleanupReason =>
  value in CLEANUP_REASON_SET

export const isUsageTier = (value: string): value is UsageTier => value in USAGE_TIER_SET

export const isGateRule = (value: string): value is GateRule => value in GATE_RULE_SET

export const isVerdictKind = (value: string): value is VerdictKind => value in VERDICT_KIND_SET

export type PendingGateResult = 'all_clear' | 'has_critical' | 'has_optional_only'
const PENDING_GATE_RESULT_SET: Record<PendingGateResult, true> = {
  all_clear: true,
  has_critical: true,
  has_optional_only: true,
}
export const PENDING_GATE_RESULTS = Object.keys(PENDING_GATE_RESULT_SET) as PendingGateResult[]
export const isPendingGateResult = (v: string): v is PendingGateResult =>
  v in PENDING_GATE_RESULT_SET

export type PendingWaitTime = 'lt_1d' | '1_7d' | '7_30d' | 'gt_30d'
const PENDING_WAIT_TIME_SET: Record<PendingWaitTime, true> = {
  lt_1d: true,
  '1_7d': true,
  '7_30d': true,
  gt_30d: true,
}
export const PENDING_WAIT_TIMES = Object.keys(PENDING_WAIT_TIME_SET) as PendingWaitTime[]
export const isPendingWaitTime = (v: string): v is PendingWaitTime => v in PENDING_WAIT_TIME_SET

export type PendingSort = 'submitted_desc' | 'submitted_asc' | 'name_asc'
const PENDING_SORT_SET: Record<PendingSort, true> = {
  submitted_desc: true,
  submitted_asc: true,
  name_asc: true,
}
export const PENDING_SORTS = Object.keys(PENDING_SORT_SET) as PendingSort[]
export const isPendingSort = (v: string): v is PendingSort => v in PENDING_SORT_SET

export type MarketplaceStatusFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'
export const MARKETPLACE_STATUS_FILTERS: Record<MarketplaceStatusFilter, true> = {
  ALL: true,
  VERIFIED: true,
  PENDING: true,
  REJECTED: true,
}
export function isMarketplaceStatusFilter(v: unknown): v is MarketplaceStatusFilter {
  return typeof v === 'string' && v in MARKETPLACE_STATUS_FILTERS
}
/**
 * `GET /entities/{kind}/marketplace-assistants` takes `status` as this same
 * UI vocabulary directly (`query.status: Input should be 'ALL', 'VERIFIED',
 * 'PENDING' or 'REJECTED'` — measured against the live backend) and maps it
 * to internal `marketplace_status` values itself. So this passes the value
 * straight through; only `ALL` becomes "no filter" (omit the param) rather
 * than a literal `ALL` on the wire.
 */
export function toBackendStatus(f: MarketplaceStatusFilter): string | undefined {
  return f === 'ALL' ? undefined : f
}

/**
 * Read an enum-valued query param, returning `null` for anything the API
 * would reject. Shared by the cleanup and assistants filter hooks.
 *
 * An unrecognised value is treated as absent rather than forwarded, because
 * since EXECUTION-PLAN 4.2 the backend returns 422 for unknown enum values.
 */
export const parseEnumParam = <T extends string>(
  raw: string | null,
  isValid: (value: string) => value is T
): T | null => (raw != null && isValid(raw) ? raw : null)

/**
 * Parse a positive integer query param, returning `fallback` for anything
 * absent, non-numeric or out of range. Prevents `?page=abc` and `?page=-3`
 * from putting the table into a state the API rejects.
 */
export const parsePositiveInt = (raw: string | null, fallback: number): number => {
  if (raw == null) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) || parsed < 1 ? fallback : parsed
}
