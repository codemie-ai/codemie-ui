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

import InfoIcon from '@/assets/icons/info.svg?react'
import Tooltip from '@/components/Tooltip/Tooltip'
import { ABSENT_VALUE_MARKER } from '@/constants'
import { getStatusColor } from '@/pages/analytics/components/widgets/RatioWidget/utils'
import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'
import { MetricFormat, MetricValue } from '@/types/analytics'
import { formatMetricValue } from '@/utils/analyticsFormatters'
import { getTailwindColor } from '@/utils/tailwindColors'

export const SPENDING_DANGER_THRESHOLD = 75
export const SPENDING_WARNING_THRESHOLD = 50

// The colour this app already uses for "nothing is known here". An unknown consumption must not
// borrow the green/yellow/red vocabulary that only a measured one has earned.
const UNKNOWN_CONSUMPTION_COLOR_PROPERTY = '--colors-text-quaternary'

interface SpendingUsageProps {
  percentage: MetricValue
  spent: MetricValue
  limit: MetricValue
  limitLabel?: string
  limitLabelTooltip?: string
  spendingLabel?: string
}

const SpendingUsage: FC<SpendingUsageProps> = ({
  percentage,
  spent,
  limit,
  limitLabel = 'Personal limit',
  limitLabelTooltip,
  spendingLabel = 'Your spending',
}) => {
  // null, never 0: the backend refuses to compute a percentage when the spend figure is absent or no
  // limit is configured, and "0% consumed" would assert a fact nobody has.
  const usage = typeof percentage === 'number' ? Math.min(Math.max(percentage, 0), 100) : null

  const statusColor =
    usage === null
      ? getTailwindColor(UNKNOWN_CONSUMPTION_COLOR_PROPERTY)
      : getStatusColor(usage, SPENDING_DANGER_THRESHOLD, SPENDING_WARNING_THRESHOLD)

  // Like the percentage, an unknown remainder is the absent marker, never "$0.00 available".
  const available =
    typeof spent === 'number' && typeof limit === 'number'
      ? formatMetricValue(Math.max(0, limit - spent), MetricFormat.CURRENCY)
      : ABSENT_VALUE_MARKER

  return (
    <div className="flex flex-col gap-2 w-full min-w-0 text-sm leading-lg">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-text-quaternary whitespace-nowrap">
          {limitLabel}
          {limitLabelTooltip && (
            <>
              <InfoIcon
                className="w-3.5 h-3.5 text-text-quaternary cursor-pointer flex-shrink-0"
                data-pr-tooltip={limitLabelTooltip}
                data-pr-position="top"
              />
              <Tooltip
                target={`[data-pr-tooltip="${limitLabelTooltip}"]`}
                appendTo={() => document.body}
              />
            </>
          )}
        </span>
        <span className="font-semibold whitespace-nowrap" style={{ color: statusColor }}>
          {usage === null ? ABSENT_VALUE_MARKER : `${usage.toFixed(2)}%`}
        </span>
      </div>

      <SpendingProgressBar
        percentage={usage ?? 0}
        dangerThreshold={SPENDING_DANGER_THRESHOLD}
        warningThreshold={SPENDING_WARNING_THRESHOLD}
        fullWidth
        hideLabel
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-text-quaternary whitespace-nowrap">
          {spendingLabel}: {formatMetricValue(spent, MetricFormat.CURRENCY)}
        </span>
        <span className="text-xs text-text-quaternary whitespace-nowrap">
          Available:{' '}
          <span className="font-semibold" style={{ color: statusColor }}>
            {available}
          </span>
        </span>
      </div>
    </div>
  )
}

export default SpendingUsage
