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

import { ABSENT_VALUE_MARKER } from '@/constants'
import { MetricFormat } from '@/types/analytics'
import { formatCurrency, formatMoneySpent } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'

// Compact token counts (K/M/B). Mirrors the analytics reference app's `fmtTokens`.
export const formatTokens = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n || 0)
}

// A chart cell is either a measured amount or null for "not measured"; null must never become 0.
export const toSeriesPoint = (cell: unknown): number | null =>
  cell === null || cell === undefined ? null : Number(cell)

/** One record's money as the backend stores it beside its tokens - an execution's, a data source's. */
interface RecordMoneySpent {
  money_spent?: number | null
  money_spent_pending?: boolean
  money_spent_unavailable?: boolean
}

/**
 * One record's money spent with its pending/unavailable qualifier. Four decimals because a single
 * record's cost is routinely smaller than a cent. A record flagged pending or unavailable never
 * shows its amount - it renders the absent marker plus the qualifier, whether the amount is null,
 * zero or non-zero. An unflagged zero really cost nothing and renders `$0.0000`.
 */
export const formatRecordMoneySpent = (usage: RecordMoneySpent | null | undefined): string =>
  formatMoneySpent(usage?.money_spent, {
    pending: usage?.money_spent_pending,
    unavailable: usage?.money_spent_unavailable,
  })

export const formatMetricValue = (
  value: string | number | boolean | null | undefined,
  format?: MetricFormat
): string => {
  // An absent figure is not a zero. Number(null) is 0, so this must precede every coercion below,
  // or "nobody recorded any spend" renders as the claim "$0.00 was spent".
  if (value === null || value === undefined) {
    return ABSENT_VALUE_MARKER
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (format === MetricFormat.CURRENCY) {
    return formatCurrency(Number(value))
  }

  if (format === MetricFormat.PERCENTAGE) {
    return `${Number(value).toFixed(2)}%`
  }

  if (format === MetricFormat.DURATION) {
    return `${value}m`
  }

  if (format === MetricFormat.TOKENS) {
    return formatTokens(Number(value))
  }

  if (format === MetricFormat.TIMESTAMP) {
    return formatDateTime(String(value))
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  return String(value)
}

export const humanizeAnalyticsLabel = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
