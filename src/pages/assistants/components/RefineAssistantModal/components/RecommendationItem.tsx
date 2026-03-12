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

import React from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import Button from '@/components/Button'
import TextDiffView from '@/components/TextDiffView'
import { ButtonSize } from '@/constants'
import { RecommendationAction } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

import ActionBadge from './ActionBadge'

interface RecommendationItemProps {
  title: string
  action: RecommendationAction
  reason?: string | null
  currentValue?: string | string[]
  recommendedValue?: string | string[]
  currentLabel?: string
  recommendedLabel?: string
  showApplyButton?: boolean
  onApply?: () => void
  isApplied?: boolean
  className?: string
  showDiff?: boolean
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  title,
  action,
  reason,
  currentValue,
  recommendedValue,
  currentLabel = 'Current Status',
  recommendedLabel = 'AI Suggestion',
  showApplyButton = false,
  onApply,
  isApplied = false,
  className,
  showDiff = false,
}) => {
  const renderValue = (value: string | string[] | undefined, isPurple = false) => {
    if (!value) return <p className="text-sm text-text-quaternary">Not set</p>

    if (Array.isArray(value)) {
      return (
        <ul className="space-y-3">
          {value.map((item, idx) => (
            <li
              key={idx}
              className={cn('text-sm', isPurple ? 'text-text-primary' : 'text-text-quaternary')}
            >
              {item}
            </li>
          ))}
        </ul>
      )
    }
    return (
      <p
        className={cn(
          'text-sm whitespace-pre-wrap',
          isPurple ? 'text-text-primary' : 'text-text-quaternary'
        )}
      >
        {value}
      </p>
    )
  }

  const shouldShowComparison = currentValue !== undefined || recommendedValue !== undefined

  const getTextForDiff = (value: string | string[] | null | undefined): string => {
    if (!value) return ''
    if (Array.isArray(value)) {
      if (value.length === 0) return ''
      return value.join('\n')
    }
    return value
  }

  const canShowDiff = showDiff && currentValue !== undefined && recommendedValue !== undefined

  const diffOldText = canShowDiff ? getTextForDiff(currentValue) : ''
  const diffNewText = canShowDiff ? getTextForDiff(recommendedValue) : ''

  return (
    <div
      className={cn('rounded-lg bg-surface-base-chat border border-border-structural', className)}
    >
      <div className="p-4 flex items-start justify-between mb-4 bg-surface-base-secondary rounded-t-lg border-b-border-structural border-b">
        <h4 className="text-sm font-medium text-text-primary">{title}</h4>
        <ActionBadge action={action} />
      </div>

      <div className="p-4">
        {shouldShowComparison && (
          <>
            {canShowDiff ? (
              <div className="mb-4">
                <TextDiffView
                  oldText={diffOldText}
                  newText={diffNewText}
                  oldLabel={currentLabel}
                  newLabel={recommendedLabel}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h5 className="text-xs font-normal text-text-quaternary mb-2">{currentLabel}:</h5>
                  <div className="bg-surface-interactive-hover rounded-lg p-3 border border-border-structural">
                    {renderValue(currentValue)}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-normal text-text-accent-status mb-2">
                    {recommendedLabel}:
                  </h5>
                  <div className="bg-gradient1 rounded-lg p-3 border border-transparent">
                    {renderValue(recommendedValue, true)}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {reason && (
          <div className="flex gap-2 mb-4 py-3">
            <AIGenerateSVG className="mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-text-primary">Why this change?</h5>
              <p className="text-xs text-text-primary leading-relaxed">&quot;{reason}&quot;</p>
            </div>
          </div>
        )}

        {showApplyButton && onApply && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              size={ButtonSize.SMALL}
              onClick={onApply}
              disabled={isApplied}
            >
              {isApplied ? 'Applied' : 'Apply Suggestion'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecommendationItem
