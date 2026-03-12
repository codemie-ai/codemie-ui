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
import { cn } from '@/utils/utils'

interface ActionBadgeProps {
  action: RecommendationAction
  className?: string
}

const ActionBadge: React.FC<ActionBadgeProps> = ({ action, className }) => {
  const getActionStyles = () => {
    switch (action) {
      case RecommendationAction.CHANGE:
        return 'bg-aborted-tertiary text-aborted-primary border-aborted-secondary'
      case RecommendationAction.ADD:
        return 'bg-success-secondary text-success-primary border-success-primary'
      case RecommendationAction.DELETE:
        return 'bg-failed-tertiary text-failed-secondary border-failed-secondary'
      case RecommendationAction.KEEP:
        return 'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary'
      default:
        return 'bg-in-progress-tertiary text-in-progress-primary border-in-progress-secondary'
    }
  }

  const getActionLabel = () => {
    switch (action) {
      case RecommendationAction.CHANGE:
        return 'IMPROVE'
      case RecommendationAction.DELETE:
        return 'DELETE'
      case RecommendationAction.KEEP:
        return 'KEEP'
      case RecommendationAction.ADD:
        return 'ADD'
      default:
        return action
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-xl text-xs font-bold uppercase border',
        getActionStyles(),
        className
      )}
    >
      {getActionLabel()}
    </span>
  )
}

export default ActionBadge
