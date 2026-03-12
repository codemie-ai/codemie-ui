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

import { RecommendationSeverity } from '@/types/entity/assistant'
import { cn } from '@/utils/utils'

export interface SeverityBadgeProps {
  severity: RecommendationSeverity
}

const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const isCritical = severity === RecommendationSeverity.CRITICAL

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium uppercase',
        isCritical ? 'bg-failed-tertiary text-failed-primary' : 'bg-aborted-tertiary text-aborted-primary'
      )}
    >
      {isCritical ? 'Critical' : 'Optional'}
    </span>
  )
}

export default SeverityBadge
