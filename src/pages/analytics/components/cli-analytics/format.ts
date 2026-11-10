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

import {
  PROJECT_ORIGIN_LABELS,
  ROUTE_NOTE_LABELS,
  SUBSCRIPTION_LABELS,
} from '@/constants/cliAnalytics'
import { ColumnType, MetricFormat, type Metric } from '@/types/analytics'
import type { RepositoryRow, SessionRow, SessionSummaryMetric } from '@/types/cliAnalytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

// session_count/cost_usd/files_changed/net_lines/tool_success_rate are shared by RepositoryRow
// and RepositoryBranchRow, so either can be passed without reshaping into the other's type.
type RepoMetricsSource = Pick<
  RepositoryRow,
  'session_count' | 'cost_usd' | 'files_changed' | 'net_lines' | 'tool_success_rate'
>

const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY
// A month has no fixed length; 30 days is the working approximation.
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY

// Units from largest to smallest. A duration is shown with the three units starting at the largest
// one it fills, so the figure stays short: "2mo 1w 3d", "1w 2d 3h", "1d 2h 3m", "1h 2m 3s".
const DURATION_UNITS: { label: string; seconds: number }[] = [
  { label: 'mo', seconds: SECONDS_PER_MONTH },
  { label: 'w', seconds: SECONDS_PER_WEEK },
  { label: 'd', seconds: SECONDS_PER_DAY },
  { label: 'h', seconds: SECONDS_PER_HOUR },
  { label: 'm', seconds: SECONDS_PER_MINUTE },
  { label: 's', seconds: 1 },
]
const DURATION_UNITS_SHOWN = 3

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  let remaining = Math.floor(ms / 1000)

  // Below one minute there is no larger unit to fill, so start at seconds.
  const first = Math.max(
    0,
    DURATION_UNITS.findIndex((unit) => remaining >= unit.seconds)
  )
  // Seconds and minutes are the last units; keep the window inside the list ("5s", "1m 30s").
  const window = DURATION_UNITS.slice(first, first + DURATION_UNITS_SHOWN)

  return window
    .map(({ label, seconds }) => {
      const value = Math.floor(remaining / seconds)
      remaining -= value * seconds
      return `${value}${label}`
    })
    .join(' ')
}

// Branch on the counter, not the rate: 0 of 0 is "no data", 0 of 12 is a real 0%.
export function formatToolSuccess(
  rate: number | null | undefined,
  toolCalls: number | null | undefined
): string {
  if ((toolCalls ?? 0) === 0) return '—'
  return formatMetricValue(rate ?? 0, MetricFormat.PERCENTAGE)
}

type SessionSummaryFields = Pick<SessionRow, 'summary_state' | 'summary_metrics'>

// Complete only when the final summary reports this metric; missing metadata (older backend) is unknown.
export function isSessionMetricComplete(
  s: SessionSummaryFields,
  metric: SessionSummaryMetric
): boolean {
  return s.summary_state === 'final' && (s.summary_metrics ?? []).includes(metric)
}

const incompleteNote = (s: SessionSummaryFields) => {
  if (s.summary_state === 'provisional') return 'Provisional'
  return s.summary_state === 'none' ? 'Summary unavailable' : 'Partial'
}

export interface SessionCount {
  value: string
  note?: string
}

// null/undefined is unknown ("—"), a reported 0 stays "0"; an incomplete count is a lower bound.
export function describeSessionCount(
  count: number | null | undefined,
  s: SessionSummaryFields,
  metric: SessionSummaryMetric
): SessionCount {
  if (count == null) return { value: '—', note: 'Not reported' }
  const value = count.toLocaleString()
  if (isSessionMetricComplete(s, metric)) return { value }
  return {
    value,
    note: incompleteNote(s),
  }
}

type SessionToolCalls = Pick<
  SessionRow,
  'tool_call_count' | 'tool_calls_total' | 'summary_state' | 'summary_metrics'
> & { tool_calls_success?: number | null; tool_success_rate?: number | null }

// Total comes from the session summary; observed calls (and their success rate) are only what telemetry saw.
export function describeSessionToolCalls(s: SessionToolCalls): SessionCount {
  const observed = s.tool_call_count ?? 0
  const total = s.tool_calls_total
  const complete = total != null && isSessionMetricComplete(s, 'tool_calls')
  const notes: string[] = []
  let value: string

  if (total != null) {
    value = total.toLocaleString()
    if (!complete) {
      notes.push(incompleteNote(s))
    }
  } else if (observed > 0) {
    value = observed.toLocaleString()
    notes.push('Observed only')
  } else {
    return { value: '—', note: 'Not reported' }
  }

  if (observed > 0 && s.tool_calls_success != null && s.tool_success_rate != null) {
    const ok = `${s.tool_success_rate}% ok`
    // "Observed only" already scopes the rate when there is no total
    const sameAsTotal = total == null || (complete && total === observed)
    notes.push(
      sameAsTotal
        ? ok
        : `${observed.toLocaleString()} observed of ${total?.toLocaleString()} total · ${ok}`
    )
  } else if (total != null && total > 0 && observed === 0) {
    notes.push('No outcomes observed')
  }
  return { value, note: notes.join(' · ') }
}

export function truncateModelName(name: string, max = 25): string {
  if (!name) return '—'
  return name.length > max ? `${name.slice(0, max)}…` : name
}

export function buildRepoMetrics(row: RepoMetricsSource): Metric[] {
  return [
    { id: 'session_count', label: 'Sessions', type: ColumnType.INTEGER, value: row.session_count },
    {
      id: 'cost_usd',
      label: 'Est. Cost',
      type: ColumnType.NUMBER,
      format: MetricFormat.CURRENCY,
      value: row.cost_usd,
    },
    {
      id: 'files_changed',
      label: 'Files Changed',
      type: ColumnType.INTEGER,
      value: row.files_changed,
    },
    { id: 'net_lines', label: 'Net Lines', type: ColumnType.INTEGER, value: row.net_lines },
    {
      id: 'tool_success_rate',
      label: 'Tool Success',
      type: ColumnType.NUMBER,
      format: MetricFormat.PERCENTAGE,
      value: row.tool_success_rate,
    },
  ]
}

export const LINES_NOT_REPORTED_TITLE = 'Not reported - no line data was received'

export function formatLines(value: number | null | undefined): string {
  return formatMetricValue(value)
}

export function linesTitle(value: number | null | undefined): string | undefined {
  return value == null ? LINES_NOT_REPORTED_TITLE : undefined
}

// Known values get a fixed label; anything else is shown as received (never mapped to a known class),
// and a missing value reads as unclassified.
const known = (labels: Record<string, string>, value: string) =>
  Object.hasOwn(labels, value) ? labels[value] : value

const labelOf = (
  labels: Record<string, string>,
  value: string | null | undefined,
  missing: string
) => (value ? known(labels, value) : missing)

export const subscriptionLabel = (value: string | null | undefined) =>
  labelOf(SUBSCRIPTION_LABELS, value, SUBSCRIPTION_LABELS.unknown)

export const projectOriginLabel = (value: string | null | undefined) =>
  labelOf(PROJECT_ORIGIN_LABELS, value, PROJECT_ORIGIN_LABELS.none)

// The backend's label wins when it sends a nonblank one (shown sentence-cased: the backend sends it
// lowercase). Otherwise the note is mapped; a note this UI does not know is shown as received.
// Neither => undefined (no warning).
export const routeWarning = (label: string | null | undefined, note: string | null | undefined) => {
  const text = label?.trim()
  if (text) return text[0].toUpperCase() + text.slice(1)
  return note ? known(ROUTE_NOTE_LABELS, note) : undefined
}
