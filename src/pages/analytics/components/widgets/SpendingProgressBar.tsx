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
  spend?: number | null
  className?: string
  dangerThreshold?: number
  warningThreshold?: number
}

const SpendingProgressBar: FC<SpendingProgressBarProps> = ({
  percentage,
  spend,
  className,
  dangerThreshold = 90,
  warningThreshold = 75,
}) => {
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100)

  const barColor = useMemo(
    () => getStatusColor(normalizedPercentage, dangerThreshold, warningThreshold),
    [normalizedPercentage, dangerThreshold, warningThreshold]
  )

  const bgColor = useMemo(
    () => getStatusColorWithOpacity(normalizedPercentage, dangerThreshold, warningThreshold),
    [normalizedPercentage, dangerThreshold, warningThreshold]
  )

  // Validate spend: accept only finite, non-negative numbers
  const label = useMemo(() => {
    const validatedSpend =
      typeof spend === 'number' && Number.isFinite(spend) && spend >= 0 ? spend : null
    return `${formatSpend(validatedSpend)} (${Math.round(normalizedPercentage)}%)`
  }, [spend, normalizedPercentage])

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div className="relative h-2 w-[110px] rounded-[99px]" style={{ backgroundColor: bgColor }}>
        <div
          className="absolute top-0 left-0 h-full rounded-[99px] transition-all"
          style={{
            width: `${normalizedPercentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <span
        className="text-sm font-semibold leading-none whitespace-nowrap text-right"
        style={{ color: barColor }}
      >
        {label}
      </span>
    </div>
  )
}

export default SpendingProgressBar
