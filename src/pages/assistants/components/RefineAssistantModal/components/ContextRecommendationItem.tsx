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

import { ContextRecommendation, RecommendationAction } from '@/types/entity/assistant'

import RecommendationItem from './RecommendationItem'

interface ContextRecommendationItemProps {
  context: ContextRecommendation
  isCurrentlyEnabled: boolean
  isApplied: boolean
  onApply: () => void
  className?: string
}

const ContextRecommendationItem: React.FC<ContextRecommendationItemProps> = ({
  context,
  isCurrentlyEnabled,
  isApplied,
  onApply,
  className,
}) => {
  const getStatusLabels = () => {
    switch (context.action) {
      case RecommendationAction.CHANGE:
        return {
          current: isCurrentlyEnabled ? 'Enabled' : 'Disabled',
          recommended: isCurrentlyEnabled ? 'Disable' : 'Enable',
        }
      case RecommendationAction.KEEP:
        return {
          current: isCurrentlyEnabled ? 'Enabled' : 'Disabled',
          recommended: isCurrentlyEnabled ? 'Keep enabled' : 'Keep disabled',
        }
      case RecommendationAction.DELETE:
        return {
          current: 'Enabled',
          recommended: 'Remove',
        }
      case RecommendationAction.ADD:
        return {
          current: 'Disabled',
          recommended: 'Enable',
        }
      default:
        return {
          current: isCurrentlyEnabled ? 'Enabled' : 'Disabled',
          recommended: 'No change',
        }
    }
  }

  const statusLabels = getStatusLabels()
  const shouldShowApplyButton = context.action !== RecommendationAction.KEEP

  return (
    <RecommendationItem
      title={context.name}
      action={context.action}
      reason={context.reason}
      currentValue={statusLabels.current}
      recommendedValue={statusLabels.recommended}
      currentLabel="Current Status"
      recommendedLabel="AI Suggestion"
      showApplyButton={shouldShowApplyButton}
      onApply={onApply}
      isApplied={isApplied}
      className={className}
    />
  )
}

export default ContextRecommendationItem
