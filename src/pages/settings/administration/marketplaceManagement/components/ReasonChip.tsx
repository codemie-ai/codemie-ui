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

import { FC } from 'react'

import type { CleanupReason } from '@/types/generated/marketplaceManagement'
import { formatLabelSentenceCase } from '@/utils/formatLabel'
import { cn } from '@/utils/utils'

interface ReasonChipProps {
  reason: string
  className?: string
}

/** snake_case slug -> sentence-case text. Shared by both label helpers. */
const humanise = (value: string): string => formatLabelSentenceCase(value.toLowerCase().trim())

/**
 * Canonical reason vocabulary — typed `Record<CleanupReason, string>`, so it
 * is a 1:1 mirror of the generated enum by construction rather than by
 * convention: a reason the backend adds fails to compile until it has a
 * label, and an invented one (F-68) fails to compile at all. These five
 * lowercase slugs are
 * the only values `verdict.reason` can ever hold, so anything else in this map
 * is a label no admin can reach. Every surface that shows a cleanup reason
 * renders through here so the Overview table, the cleanup table and the
 * active-filter chips cannot drift apart.
 */
export const REASON_LABEL: Record<CleanupReason, string> = {
  duplicate: 'Duplicate',
  purpose_duplicate: 'Duplicate purpose',
  semantic_clone: 'Near-identical copy',
  invalid: 'Fails quality checks',
  dead: 'Unused',
}

/** Falls back to a humanised form so an unmapped code is still readable. */
export const reasonLabel = (reason: string): string =>
  REASON_LABEL[reason.toLowerCase() as CleanupReason] ?? humanise(reason)

/**
 * `Verdict.bucket_reason` is a composite engine expression: a bucket slug, an
 * optional colon, and the debug predicate that fired
 * (`hot_but_thin:desc<100`, `warm_polish_gaps:desc<250,cats<2,no_icon`).
 * Only the prefix means anything to an admin — the tail is engine-internal
 * and belongs in a tooltip, not in a table cell.
 */
export const bucketReasonLabel = (bucketReason: string): string =>
  humanise(bucketReason.split(':')[0])

const PREDICATE_LABEL = (predicate: string): string => {
  const m = /^(desc|prompt|cats|starters)<(\d+)$/.exec(predicate)
  if (m) {
    const [, field, n] = m
    const phrase: Record<string, string> = {
      desc: `description is under ${n} characters`,
      prompt: `system prompt is under ${n} characters`,
      cats: `fewer than ${n} categories`,
      starters: `fewer than ${n} conversation starters`,
    }
    return phrase[field] ?? predicate
  }
  if (predicate === 'no_icon') return 'no icon set'
  if (predicate === 'empty_shell') return 'no tools/connections and a short prompt'
  if (predicate === 'low_use') return 'very low usage'
  return predicate.replace(/_/g, ' ')
}

/**
 * Bare `bucket_reason` slugs (no predicate tail) whose humanised label alone
 * doesn't convey the rule — e.g. "Grace fail" and "Dead new" read as jargon
 * on their own. Each value is the lowercase clause that follows "<Label> — "
 * in the tooltip, matching the predicate-tail style below (e.g.
 * "Cold thin — description is under 250 characters, no icon set...").
 */
const BARE_SLUG_EXPLANATION: Record<string, string> = {
  invalid_metadata: 'fails 2 or more critical quality checks',
  duplicate: 'a near-duplicate of another, more-used assistant',
  semantic_clone: 'part of a cluster of near-identical assistants with a clear canonical version',
  purpose_duplicate: 'serves the same purpose as another, more-used assistant',
  big_cluster_surplus: 'a surplus member of an oversized cluster of similar assistants',
  cleanup: 'flagged for removal by the audit engine',
}

/**
 * Live audit-config thresholds needed to phrase tier/window clauses with
 * real numbers instead of unreadable internal names like "the Cold tier
 * floor" or "the archive threshold" — every field optional so a clause can
 * render (falling back to '?') before the audit config has loaded.
 */
export interface BucketReasonThresholds {
  hotMinUsers?: number
  coldMinUsers?: number
  warmMinUsers?: number
  graceDays?: number
  archiveDeadAfterDays?: number
}

/**
 * Bare slugs whose clause depends on live config values — same live-config
 * pattern as `getTierTooltip`. Kept separate from `BARE_SLUG_EXPLANATION`
 * (static strings) because these need `thresholds` to render a number.
 */
const THRESHOLD_SLUG_EXPLANATION: Record<string, (t: BucketReasonThresholds) => string> = {
  grace_fail: ({ warmMinUsers, graceDays }) =>
    `usage never grew past ${warmMinUsers ?? '?'} users (Warm tier min.) during the ${
      graceDays ?? '?'
    }-day (Cold grace period)`,
  dead_new: ({ coldMinUsers, archiveDeadAfterDays }) =>
    `usage under ${coldMinUsers ?? '?'} users (Cold tier min.), but still inside the ${
      archiveDeadAfterDays ?? '?'
    }-day (Dead grace period) window`,
  dead_zero_signal: ({ coldMinUsers, archiveDeadAfterDays }) =>
    `usage under ${coldMinUsers ?? '?'} users (Cold tier min.) and inactive for more than ${
      archiveDeadAfterDays ?? '?'
    } days (Dead grace period)`,
  // Bucket = Qualified outcomes. Previously left unlisted on the assumption
  // the label alone was clear, but that meant the Audit rule column showed
  // no tooltip at all for the majority of rows in the cleanup queue.
  hot_adoption: ({ hotMinUsers }) =>
    `high adoption ${hotMinUsers ?? '?'}+ users (Hot tier) with all core and polish checks passed`,
  warm_qualified: ({ warmMinUsers, hotMinUsers }) =>
    `active usage ${warmMinUsers ?? '?'}–${
      hotMinUsers ?? '?'
    } users (Warm tier) with at most one minor polish gap`,
  cold_full_polish: ({ coldMinUsers, warmMinUsers }) =>
    `low usage ${coldMinUsers ?? '?'}–${
      warmMinUsers ?? '?'
    } users (Cold tier) with all core and polish checks passed`,
}

/**
 * Human-readable explanation of a `bucket_reason` expression, for use in a
 * tooltip next to `bucketReasonLabel`. Always "<Label> — <clause>", matching
 * the predicate-tail style. For a bare slug with no colon, the clause comes
 * from `THRESHOLD_SLUG_EXPLANATION` (needs live config numbers) or
 * `BARE_SLUG_EXPLANATION` (static) when the label alone isn't clear, or
 * `null` when the cell label already carries the full meaning.
 */
export const humanizeBucketReason = (
  bucketReason: string,
  thresholds: BucketReasonThresholds = {}
): string | null => {
  const colonIdx = bucketReason.indexOf(':')
  if (colonIdx === -1) {
    const thresholdClause = THRESHOLD_SLUG_EXPLANATION[bucketReason]
    const clause = thresholdClause
      ? thresholdClause(thresholds)
      : BARE_SLUG_EXPLANATION[bucketReason]
    return clause ? `${humanise(bucketReason)} — ${clause}` : null
  }
  const label = humanise(bucketReason.slice(0, colonIdx))
  const predicates = bucketReason
    .slice(colonIdx + 1)
    .split(',')
    .map(PREDICATE_LABEL)
    .join(', ')
  return `${label} — ${predicates}`
}

/**
 * Maps the engine's triage verdict enum to a reviewer-readable label.
 *
 * The column used to surface `CANDIDATE_FOR_CLEANUP` verbatim — a backend enum
 * member shown to a person. Every other coded value on this page is mapped to a
 * label; the fallback humanises rather than passing an unknown member through so
 * a new verdict never surfaces as SCREAMING_SNAKE.
 *
 * Exported here so every surface that shows a verdict kind (cleanup table,
 * EntityReviewPane) shares the same mapping and cannot drift apart.
 */
const VERDICT_KIND_LABEL: Record<string, string> = {
  KEEP: 'Keep',
  REVIEW: 'Review',
  CANDIDATE_FOR_CLEANUP: 'Cleanup',
}

export const verdictKindLabel = (kind: string): string =>
  VERDICT_KIND_LABEL[kind] ??
  kind
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())

const ReasonChip: FC<ReasonChipProps> = ({ reason, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        'bg-surface-base-secondary text-text-secondary border border-border-structural',
        'whitespace-nowrap',
        className
      )}
    >
      {reasonLabel(reason)}
    </span>
  )
}

export default ReasonChip
