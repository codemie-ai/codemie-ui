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
import { cn } from '@/utils/utils'

interface SpendingProgressBarProps {
  percentage: number
  className?: string
  dangerThreshold?: number
  warningThreshold?: number
}

const SpendingProgressBar: FC<SpendingProgressBarProps> = ({
  percentage,
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

  return (
    <div className={cn('flex items-center gap-2', className)}>
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
        className="text-sm font-semibold leading-none whitespace-nowrap w-12 text-right"
        style={{ color: barColor }}
      >
        {normalizedPercentage.toFixed(1)}%
      </span>
    </div>
  )
}

export default SpendingProgressBar
