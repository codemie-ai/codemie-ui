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

import { FC, useMemo } from 'react'

import {
  getStatusColor,
  getStatusColorWithOpacity,
} from '@/pages/analytics/components/widgets/RatioWidget/utils'
import { formatSpend } from '@/utils/currency'
import { cn } from '@/utils/utils'

interface SpendingProgressBarProps {
  percentage: number
  /** When spend or limit is passed, the label reads "spend / limit (pct%)" instead of the plain percentage */
  spend?: number | null
  limit?: number | null
  className?: string
  fullWidth?: boolean
  dangerThreshold?: number
  warningThreshold?: number
}

const SpendingProgressBar: FC<SpendingProgressBarProps> = ({
  percentage,
  spend,
  limit,
  className,
  fullWidth = false,
  dangerThreshold = 90,
  warningThreshold = 75,
}) => {
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100)
  const showAmounts = spend !== undefined || limit !== undefined

  const barColor = useMemo(
    () => getStatusColor(normalizedPercentage, dangerThreshold, warningThreshold),
    [normalizedPercentage, dangerThreshold, warningThreshold]
  )

  const bgColor = useMemo(
    () => getStatusColorWithOpacity(normalizedPercentage, dangerThreshold, warningThreshold),
    [normalizedPercentage, dangerThreshold, warningThreshold]
  )

  // Validate spend: accept only finite, non-negative numbers
  const amountsLabel = useMemo(() => {
    const validatedSpend =
      typeof spend === 'number' && Number.isFinite(spend) && spend >= 0 ? spend : null
    const limitText = limit === undefined ? '' : ` / ${formatSpend(limit)}`
    return `${formatSpend(validatedSpend)}${limitText} (${normalizedPercentage.toFixed(1)}%)`
  }, [spend, limit, normalizedPercentage])

  const content = (
    <div
      className={cn(
        'flex items-center gap-2',
        showAmounts ? 'flex-wrap min-w-0 w-full' : 'w-full',
        className
      )}
    >
      <div
        className={cn(
          'relative h-2 rounded-[99px]',
          showAmounts
            ? 'min-w-[96px] flex-1 basis-[96px]'
            : cn('min-w-0 flex-1', !fullWidth && 'w-[110px]')
        )}
        style={{ backgroundColor: bgColor }}
      >
        <div
          className="absolute top-0 left-0 h-full rounded-[99px] transition-all"
          style={{
            width: `${normalizedPercentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <span
        className={cn(
          'text-sm font-semibold leading-none whitespace-nowrap text-right',
          showAmounts
            ? 'max-xl:whitespace-normal max-xl:text-left max-xl:leading-tight [@container(max-width:281px)]:basis-full'
            : 'w-12'
        )}
        style={{ color: barColor }}
      >
        {showAmounts ? amountsLabel : `${normalizedPercentage.toFixed(1)}%`}
      </span>
    </div>
  )

  // Amounts mode: stack the label under the bar when the available width is narrow, by container width
  // (not by label length) so every row of a list is laid out the same way
  return showAmounts ? (
    <div className="w-full [container-type:inline-size]">{content}</div>
  ) : (
    content
  )
}

export default SpendingProgressBar
