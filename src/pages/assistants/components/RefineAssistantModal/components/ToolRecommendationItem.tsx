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

import { RecommendationAction } from '@/types/entity/assistant'

import RecommendationItem from './RecommendationItem'

interface ToolRecommendationItemProps {
  toolkitName: string
  toolName: string
  action: RecommendationAction
  reason?: string | null
  isCurrentlyEnabled: boolean
  isApplied: boolean
  onApply: () => void
  className?: string
}

const ToolRecommendationItem: React.FC<ToolRecommendationItemProps> = ({
  toolkitName,
  toolName,
  action,
  reason,
  isCurrentlyEnabled,
  isApplied,
  onApply,
  className,
}) => {
  const getStatusLabels = () => {
    if (action === RecommendationAction.ADD) {
      return {
        current: 'Disabled',
        recommended: 'Enable',
      }
    }

    switch (action) {
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
      default:
        return {
          current: isCurrentlyEnabled ? 'Enabled' : 'Disabled',
          recommended: 'No change',
        }
    }
  }

  const statusLabels = getStatusLabels()
  const shouldShowApplyButton = action !== RecommendationAction.KEEP

  return (
    <RecommendationItem
      title={`${toolkitName} / ${toolName}`}
      action={action}
      reason={reason}
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

export default ToolRecommendationItem
