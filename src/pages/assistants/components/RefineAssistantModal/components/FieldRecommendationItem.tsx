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

import { FieldRecommendation, RecommendationAction } from '@/types/entity/assistant'
import { humanize } from '@/utils/helpers'

import RecommendationItem from './RecommendationItem'

interface FieldRecommendationItemProps {
  field: FieldRecommendation
  currentValue: string | string[]
  recommendedValue: string | string[]
  onApply: (field: FieldRecommendation) => void
  className?: string
  isApplied: boolean
}

const FieldRecommendationItem: React.FC<FieldRecommendationItemProps> = ({
  field,
  currentValue,
  recommendedValue,
  onApply,
  isApplied,
  className,
}) => {
  const shouldShowApplyButton =
    field.action === RecommendationAction.CHANGE && field.recommended !== undefined
  const shouldShowComparison =
    field.action === RecommendationAction.CHANGE || field.action === RecommendationAction.KEEP

  return (
    <RecommendationItem
      title={humanize(field.name)}
      action={field.action}
      reason={field.reason}
      currentValue={shouldShowComparison ? currentValue : undefined}
      recommendedValue={shouldShowComparison ? recommendedValue : undefined}
      currentLabel={`Current ${humanize(field.name)}`}
      recommendedLabel="AI Suggestion"
      showApplyButton={shouldShowApplyButton}
      onApply={() => onApply(field)}
      className={className}
      isApplied={isApplied}
      showDiff
    />
  )
}

export default FieldRecommendationItem
