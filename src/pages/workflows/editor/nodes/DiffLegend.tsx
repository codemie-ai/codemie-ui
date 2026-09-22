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

import { cn } from '@/utils/utils'
import type { DiffStatus } from '@/utils/workflowEditor/diffWorkflowGraphs'

import { DIFF_BG_CLASS } from './diffChromeContext'

const LEGEND_ITEMS: { status: DiffStatus; label: string }[] = [
  { status: 'added', label: 'Added' },
  { status: 'modified', label: 'Modified' },
  { status: 'removed', label: 'Removed' },
]

interface DiffLegendProps {
  className?: string
}

const DiffLegend: React.FC<DiffLegendProps> = ({ className }) => (
  <div
    data-testid="diff-legend"
    className={cn(
      'flex items-center gap-3 shrink-0 px-4 h-8 bg-surface-base-secondary border border-border-structural rounded-md text-xs text-text-secondary',
      className
    )}
  >
    {LEGEND_ITEMS.map(({ status, label }) => (
      <span key={status} className="flex items-center gap-1.5">
        <span
          className={cn('inline-block w-3 h-3 rounded-sm', DIFF_BG_CLASS[status])}
          aria-hidden="true"
        />
        {label}
      </span>
    ))}
  </div>
)

export default DiffLegend
