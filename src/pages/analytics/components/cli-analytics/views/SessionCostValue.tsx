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

import { FC, ReactNode } from 'react'

import { ABSENT_VALUE_MARKER } from '@/constants'
import type { RowCostPricing } from '@/types/cliAnalytics'
import { formatSpend } from '@/utils/currency'

import { CostDetailsIcon } from './CostIncompleteNotice'
import { METRIC_VALUE_CLASS_NAME } from '../../widgets/MetricCard'
import { getRowCostState, type CostState } from '../costCompleteness'

interface SessionCostValueProps {
  value: number | null | undefined
  // undefined (an older backend) keeps the plain rendering.
  costAvailable?: boolean
  // The session's own flag and model names from the API.
  costIncomplete?: boolean
  unpricedModels?: string[]
  // Right-aligned tables put the icon before the amount so the amounts stay aligned.
  iconFirst?: boolean
}

/** A session money value: unknown when nothing was priced, a marked subtotal when part of it was not. */
const SessionCostValue: FC<SessionCostValueProps> = ({
  value,
  costAvailable,
  costIncomplete,
  unpricedModels = [],
  iconFirst,
}) => {
  const unknown = costAvailable === false
  const partial = costIncomplete === true || unpricedModels.length > 0
  if (!unknown && !partial) return <>{value != null ? formatSpend(value) : ABSENT_VALUE_MARKER}</>
  const amount = unknown || value == null ? ABSENT_VALUE_MARKER : formatSpend(value)
  const icon = (
    <CostDetailsIcon
      status={unknown ? 'Cost unknown' : 'Partial estimate'}
      models={unpricedModels}
      testId="unpriced-cost-marker"
    />
  )
  return (
    <span className="inline-flex items-center gap-1">
      {iconFirst && icon}
      {amount}
      {!iconFirst && icon}
    </span>
  )
}

/** A KPI value with explicit pricing evidence, falling back to metadata for older responses. */
export const aggregateCostOverride = (
  value: number | null | undefined,
  state: CostState,
  details?: string
): ReactNode => {
  if (!state.incomplete) return null
  return (
    <p className={METRIC_VALUE_CLASS_NAME}>
      <span className="inline-flex items-center gap-1">
        {state.unknown ? ABSENT_VALUE_MARKER : formatSpend(value)}
        <CostDetailsIcon
          status={state.unknown ? 'Cost unknown' : 'Partial estimate'}
          models={state.unpricedModels}
          details={details}
          testId="unpriced-cost-marker"
        />
      </span>
    </p>
  )
}

/** A money value with its own pricing: the priced subtotal (a real $0 included) stays, and only an
 * incomplete amount is marked; "unknown" shows only when the API says nothing of it was priced. */
export const AmountCost: FC<{
  value: number | null | undefined
  pricing?: RowCostPricing | null
  iconFirst?: boolean
}> = ({ value, pricing, iconFirst = true }) => {
  const { incomplete, unknown, unpricedModels } = getRowCostState(pricing)
  if (!incomplete) return <>{formatSpend(value)}</>
  const icon = (
    <CostDetailsIcon
      status={unknown ? 'Cost unknown' : 'Partial estimate'}
      models={unpricedModels}
      testId="unpriced-cost-marker"
    />
  )
  return (
    <span className="inline-flex items-center gap-1">
      {iconFirst && icon}
      {unknown ? ABSENT_VALUE_MARKER : formatSpend(value)}
      {!iconFirst && icon}
    </span>
  )
}

/** Legend details of a cost chart, found by label (a user's name): the same marking as the table. */
export const costLegendDetails = (rows: (RowCostPricing & { developer_name: string })[]) => {
  const byName = new Map(rows.map((r) => [r.developer_name, r]))
  return (label: string) => {
    const { incomplete, unknown, unpricedModels } = getRowCostState(byName.get(label))
    if (!incomplete) return {}
    return {
      value: unknown ? ABSENT_VALUE_MARKER : undefined,
      marker: (
        <CostDetailsIcon
          status={unknown ? 'Cost unknown' : 'Partial estimate'}
          models={unpricedModels}
          testId="unpriced-cost-marker"
        />
      ),
    }
  }
}

export default SessionCostValue
