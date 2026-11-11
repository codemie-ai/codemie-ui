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

import { useKatasEnabled } from '@/hooks/useFeatureFlags'
import { formatSpend } from '@/utils/currency'
import { SPEND_QUALIFICATION_FIELDS } from '@/utils/spendQualification'

import { METRIC_LABELS, CURRENCY_METRIC_KEYS } from './constants'
import { filterSummaryMetrics } from './katasFilter'

type SummaryMetricValue = number | boolean | null

interface LeaderboardSummaryMetricsProps {
  /**
   * The raw `summary_metrics` object: counts, money figures that are `null` when nobody could price
   * them, and the annotations that qualify each money figure - all in one flat map.
   */
  summaryMetrics?: Record<string, SummaryMetricValue>
}

/**
 * `total_spend` -> `total_`, the prefix its `total_spend_unavailable`, `total_spend_partial` and
 * `total_spend_missing_amount` companions carry. Each money figure is annotated under its own name
 * because one entry reports two of them and an unprefixed annotation could not say which it meant.
 */
const spendAnnotationPrefix = (currencyKey: string): string => currencyKey.replace(/spend$/, '')

/**
 * The annotations arrive in the same flat map as the metrics. Iterated blindly they render as tiles
 * of their own - "Total Spend Unavailable" with the value "true" - so they are filtered out here.
 */
const isSpendAnnotationKey = (key: string): boolean =>
  CURRENCY_METRIC_KEYS.some((currencyKey) =>
    SPEND_QUALIFICATION_FIELDS.some(
      (field) => key === `${spendAnnotationPrefix(currencyKey)}${field}`
    )
  )

/**
 * One money tile's text: the figure, or the absent marker when the backend priced nothing. A
 * measured `0` stays `$0.00` - `formatSpend` draws that line - so "spent nothing" never renders
 * like "we don't know".
 */
const formatCurrencyMetric = (value: SummaryMetricValue): string =>
  formatSpend(typeof value === 'number' ? value : null)

const LeaderboardSummaryMetrics: FC<LeaderboardSummaryMetricsProps> = ({ summaryMetrics }) => {
  const [katasEnabled] = useKatasEnabled()
  if (!summaryMetrics || Object.keys(summaryMetrics).length === 0) {
    return null
  }

  const metricEntries = Object.entries(filterSummaryMetrics(katasEnabled, summaryMetrics)).filter(
    ([key]) => !isSpendAnnotationKey(key)
  )

  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
        Key Metrics
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {metricEntries.map(([key, value]) => {
          const label = METRIC_LABELS[key] ?? key.replace(/_/g, ' ')
          const formattedValue = CURRENCY_METRIC_KEYS.includes(key)
            ? formatCurrencyMetric(value)
            : String(value)

          return (
            <div
              key={key}
              className="rounded-md border border-border-specific-panel-outline bg-surface-elevated p-2.5"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-quaternary">
                {label}
              </p>
              <p className="text-sm font-bold tabular-nums text-text-primary">{formattedValue}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LeaderboardSummaryMetrics
