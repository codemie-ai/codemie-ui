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

import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'

import {
  DETAIL_WARNING_THRESHOLD,
  formatCurrency,
  getSpendColor,
  getSpendPercentage,
  SPENDING_DANGER_THRESHOLD,
} from './spendPresentation'

export interface BudgetSpendMetricsProps {
  spent: number | null
  /** Hard limit. Callers only render this once a real budget exists for the row being shown. */
  max: number
  soft: number | null
  remaining: number | null
}

/**
 * "How one budget is shown": spend vs. hard limit (coloured by usage), the progress bar (or its
 * "—" fallback once the limit is <= 0), and the Remaining/Soft limit pair. Shared by the project
 * budget detail card and the cost-center rollup's category card so a threshold, colour, or
 * zero-limit rule change lands in both places at once instead of drifting between two copies.
 */
const BudgetSpendMetrics: FC<BudgetSpendMetricsProps> = ({ spent, max, soft, remaining }) => {
  const percentage = getSpendPercentage(spent, max)
  const spendColor = getSpendColor(percentage)

  return (
    <>
      <div>
        <div className="text-xs text-text-quaternary">Spend / hard limit</div>
        <div className="mt-1 whitespace-nowrap text-base">
          <span className="font-semibold" style={spendColor ? { color: spendColor } : undefined}>
            {formatCurrency(spent)}
          </span>
          <span className="font-normal text-text-primary"> / {formatCurrency(max)}</span>
        </div>
        {percentage == null ? (
          <div className="mt-2 text-xs text-text-quaternary">—</div>
        ) : (
          <SpendingProgressBar
            percentage={percentage}
            dangerThreshold={SPENDING_DANGER_THRESHOLD}
            warningThreshold={DETAIL_WARNING_THRESHOLD}
            className="mt-2 !gap-1"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <div className="text-text-quaternary">Remaining</div>
          <div className="mt-1 text-sm text-text-primary">{formatCurrency(remaining)}</div>
        </div>
        <div>
          <div className="text-text-quaternary">Soft limit</div>
          <div className="mt-1 text-sm text-text-primary">{formatCurrency(soft)}</div>
        </div>
      </div>
    </>
  )
}

export default BudgetSpendMetrics
