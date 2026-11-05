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

import { ColumnType, MetricFormat, type Metric } from '@/types/analytics'
import type { RepositoryRow, SessionRow, SessionSummaryMetric } from '@/types/cliAnalytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'

// session_count/cost_usd/files_changed/net_lines/tool_success_rate are shared by RepositoryRow
// and RepositoryBranchRow, so either can be passed without reshaping into the other's type.
type RepoMetricsSource = Pick<
  RepositoryRow,
  'session_count' | 'cost_usd' | 'files_changed' | 'net_lines' | 'tool_success_rate'
>

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (h > 0 || m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
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
