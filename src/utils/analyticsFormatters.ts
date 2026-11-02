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

import { Metric, MetricFormat, SpendQualification } from '@/types/analytics'
import { formatCurrency, formatMoneySpentSuffix } from '@/utils/currency'
import { formatDateTime } from '@/utils/helpers'
import { readSpendQualification } from '@/utils/spendQualification'

// Compact token counts (K/M/B). Mirrors the analytics reference app's `fmtTokens`.
export const formatTokens = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n || 0)
}

/**
 * The one marker every analytics surface uses for "no figure exists", so `-` always means the same
 * thing wherever it appears.
 */
export const ABSENT_VALUE_MARKER = '-'

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
 * record's cost is routinely smaller than a cent. A zero flagged pending or unavailable is the
 * placeholder written before any cost settled (the backend's `SettledMoney` rule), so it renders
 * the absent marker exactly like a figure nobody priced; an unflagged zero really cost nothing.
 */
export const formatRecordMoneySpent = (usage: RecordMoneySpent | null | undefined): string => {
  const moneySpent = usage?.money_spent
  const pending = usage?.money_spent_pending
  const unavailable = usage?.money_spent_unavailable
  const suffix = formatMoneySpentSuffix({ pending, unavailable })
  const isPlaceholderZero = moneySpent === 0 && (pending || unavailable)

  if (moneySpent == null || isPlaceholderZero) return `${ABSENT_VALUE_MARKER}${suffix}`
  return `$${moneySpent.toFixed(4)}${suffix}`
}

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

// Re-exported so the analytics screens keep one import site for reading a qualification and
// formatting it. They live in a leaf module because `types/entity/userProjectSpending` needs the
// reader and must not inherit this module's `@/utils/helpers` -> `@/router` dependency.
export { SPEND_QUALIFICATION_FIELDS, readSpendQualification } from '@/utils/spendQualification'

// partial wins over unavailable: "this number is a floor" is the more specific statement, and it is
// the one that changes how a reader uses the figure. The missing amount is named only when the
// backend could compute it - nobody knows the size of the hole otherwise.
export const formatSpendQualificationSuffix = (qualification: SpendQualification): string => {
  if (qualification.spend_partial) {
    return typeof qualification.spend_missing_amount === 'number'
      ? ` (at least; ${formatCurrency(qualification.spend_missing_amount)} unattributed)`
      : ' (at least; some spend unattributed)'
  }
  if (qualification.spend_unavailable) return ' (incomplete data)'
  return ''
}

/**
 * What qualifies one row's figure in one column. The `<columnId>_`-prefixed form names its column,
 * so it wins; the unprefixed form is row-level and describes the row's money figure, which is why
 * it is only applied to a currency column - appending it to a name, a count or a date would
 * misattribute it.
 */
export const readCellSpendQualification = (
  row: Record<string, unknown>,
  column: { id: string; format?: MetricFormat }
): SpendQualification => {
  const prefixed = readSpendQualification(row, `${column.id}_`)
  if (prefixed.spend_partial || prefixed.spend_unavailable) return prefixed

  return column.format === MetricFormat.CURRENCY ? readSpendQualification(row) : {}
}

/**
 * One qualification for a whole chart, for the note under it. Its amount is named only when every
 * partial cell names the same one: the backend repeats a window's residue on each cell, so adding
 * them would overstate it, and amounts that differ name no single figure.
 */
export const formatChartSpendQualificationSuffix = (
  qualifications: SpendQualification[]
): string => {
  const partial = qualifications.filter((qualification) => qualification.spend_partial)
  if (partial.length === 0) return ''
  const amounts = new Set(partial.map((qualification) => qualification.spend_missing_amount))
  return formatSpendQualificationSuffix({
    spend_partial: true,
    spend_missing_amount: amounts.size === 1 ? partial[0].spend_missing_amount : null,
  })
}

/**
 * A metric's value with the annotation that qualifies it. Only a currency metric is annotated: the
 * qualification describes a money figure, so appending it to a count, a duration or a timestamp
 * would misattribute it - the rule `TableWidget` already applies per column.
 */
export const formatQualifiedMetricValue = (metric: Metric): string =>
  `${formatMetricValue(metric.value, metric.format)}${formatMetricQualification(metric)}`

/** The annotation alone, for a screen that sets it apart from the figure - empty for a non-currency metric. */
export const formatMetricQualification = (metric: Metric): string =>
  metric.format === MetricFormat.CURRENCY ? formatSpendQualificationSuffix(metric) : ''
