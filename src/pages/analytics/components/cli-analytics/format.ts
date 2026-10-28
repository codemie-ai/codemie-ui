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
import type { RepositoryRow } from '@/types/cliAnalytics'
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
