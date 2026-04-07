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

import { METRIC_LABELS, CURRENCY_METRIC_KEYS } from './constants'

interface LeaderboardSummaryMetricsProps {
  summaryMetrics?: Record<string, number>
}

const LeaderboardSummaryMetrics: FC<LeaderboardSummaryMetricsProps> = ({ summaryMetrics }) => {
  if (!summaryMetrics || Object.keys(summaryMetrics).length === 0) {
    return null
  }

  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
        Key Metrics
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(summaryMetrics).map(([key, value]) => {
          const label = METRIC_LABELS[key] ?? key.replace(/_/g, ' ')
          const formattedValue = CURRENCY_METRIC_KEYS.includes(key)
            ? `$${value.toFixed(2)}`
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
