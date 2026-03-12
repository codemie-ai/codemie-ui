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

import { cn } from '@/utils/utils'

interface MaturityCardProps {
  title: string
  value: number | string
  format?: 'score' | 'level'
  description?: string
  loading?: boolean
}

const getScoreColor = (value: number): string => {
  if (value >= 67) return 'text-success-primary'
  if (value >= 34) return 'text-aborted-primary'
  return 'text-failed-primary'
}

const getMaturityLevelColor = (level: string): string => {
  if (level.includes('L3') || level.includes('AGENTIC'))
    return 'bg-success-secondary text-success-primary border-success-primary'
  if (level.includes('L2') || level.includes('AUGMENTED'))
    return 'bg-aborted-tertiary text-aborted-primary border-aborted-primary'
  return 'bg-failed-tertiary text-failed-primary border-failed-primary'
}

const MaturityCard: FC<MaturityCardProps> = ({
  title,
  value,
  format = 'score',
  description,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline animate-pulse">
        <div className="h-4 bg-border-specific-panel-outline rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-border-specific-panel-outline rounded w-3/4 mb-2"></div>
        {description && <div className="h-3 bg-border-specific-panel-outline rounded w-full"></div>}
      </div>
    )
  }

  if (format === 'level' && typeof value === 'string') {
    return (
      <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline">
        <p className="text-sm text-text-quaternary mb-3 font-bold">{title}</p>
        <div
          className={cn(
            'inline-block px-4 py-2 rounded-full border text-base font-bold',
            getMaturityLevelColor(value)
          )}
        >
          {value}
        </div>
        {description && <p className="text-xs text-text-quaternary mt-3">{description}</p>}
      </div>
    )
  }

  const numValue = typeof value === 'number' ? value : parseFloat(value)
  const displayValue = !Number.isNaN(numValue) ? numValue.toFixed(1) : '-'
  const scoreColor = !Number.isNaN(numValue) ? getScoreColor(numValue) : 'text-text-primary'

  return (
    <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline">
      <p className="text-sm text-text-quaternary mb-3 font-bold">{title}</p>
      <p className={cn('text-2xl font-bold', scoreColor)}>{displayValue}</p>
      {description && <p className="text-xs text-text-quaternary mt-3">{description}</p>}
    </div>
  )
}

export default MaturityCard
