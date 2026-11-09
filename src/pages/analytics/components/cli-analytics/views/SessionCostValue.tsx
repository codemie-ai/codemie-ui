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

import AlertIcon from '@/assets/icons/alert.svg?react'
import { ABSENT_VALUE_MARKER } from '@/constants'
import { formatCliAnalyticsCost } from '@/utils/currency'

interface SessionCostValueProps {
  value: number | null | undefined
  // undefined (an older backend) keeps the plain rendering.
  costAvailable?: boolean
  unpricedModels?: string[]
}

/** A session money value: unknown when nothing was priced, marked as understated when some models were not. */
const SessionCostValue: FC<SessionCostValueProps> = ({
  value,
  costAvailable,
  unpricedModels = [],
}) => {
  const names = unpricedModels.join(', ')
  if (costAvailable === false) {
    const tooltip = names
      ? `Cost unknown: no price for ${names}`
      : 'Cost unknown: no price for this model'
    return (
      <span data-tooltip-id="react-tooltip" data-tooltip-content={tooltip}>
        {ABSENT_VALUE_MARKER}
      </span>
    )
  }
  const text = value != null ? formatCliAnalyticsCost(value) : ABSENT_VALUE_MARKER
  if (!unpricedModels.length) return <>{text}</>
  return (
    <span className="inline-flex items-center gap-1">
      {text}
      <span
        data-testid="unpriced-cost-marker"
        aria-label="Cost understated"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={`Understated: no price for ${names}`}
      >
        <AlertIcon className="w-3 h-3" />
      </span>
    </span>
  )
}

export default SessionCostValue
