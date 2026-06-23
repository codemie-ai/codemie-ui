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

import { BudgetCategory } from '@/types/entity/budget'
import { cn } from '@/utils/utils'

import BudgetAmountInput from './BudgetAmountInput'
import { PctMap } from './UnifiedBudgetDragBar'

const CATS: BudgetCategory[] = ['platform', 'cli', 'premium_models']

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  platform: 'Platform',
  cli: 'CLI',
  premium_models: 'Premium Models',
}

const CATEGORY_DOT_CLASS: Record<BudgetCategory, string> = {
  platform: 'bg-surface-specific-charts-blue',
  cli: 'bg-surface-specific-charts-cyan',
  premium_models: 'bg-surface-specific-charts-purple',
}

export interface BudgetCategoryTableProps {
  hardVals: PctMap
  softs: PctMap
  softErrors: Record<BudgetCategory, boolean>
  onHardInputChange: (cat: BudgetCategory, n: number) => void
  onSoftInputChange: (cat: BudgetCategory, n: number) => void
}

const BudgetCategoryTable: FC<BudgetCategoryTableProps> = ({
  hardVals,
  softs,
  softErrors,
  onHardInputChange,
  onSoftInputChange,
}) => {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-2 bg-surface-base-primary border border-border-structural rounded-lg p-3">
      {CATS.map((cat) => (
        <div key={`hdr-${cat}`} className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', CATEGORY_DOT_CLASS[cat])} />
          <span className="text-sm text-text-primary truncate">{CATEGORY_LABELS[cat]}</span>
        </div>
      ))}
      {CATS.map((cat) => (
        <div key={`hard-${cat}`} className="flex flex-col gap-1">
          <span className="text-xs text-text-quaternary">Hard Limit ($)</span>
          <BudgetAmountInput
            value={hardVals[cat]}
            onCommit={(n) => onHardInputChange(cat, n)}
            ariaLabel={`${CATEGORY_LABELS[cat]} hard limit`}
            className={cn(
              'bg-surface-base-secondary border border-border-structural rounded',
              'px-2 py-1 text-sm text-text-primary outline-none w-full transition-colors',
              'focus:border-border-accent',
              '[appearance:textfield]',
              '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
            )}
          />
        </div>
      ))}
      {CATS.map((cat) => (
        <div key={`soft-${cat}`} className="flex flex-col gap-1">
          <span className="text-xs text-text-quaternary">Soft Limit ($)</span>
          <BudgetAmountInput
            value={softs[cat]}
            onCommit={(n) => onSoftInputChange(cat, n)}
            ariaLabel={`${CATEGORY_LABELS[cat]} soft limit`}
            className={cn(
              'bg-surface-base-secondary border rounded',
              'px-2 py-1 text-sm outline-none w-full transition-colors',
              '[appearance:textfield]',
              '[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              softErrors[cat]
                ? 'border-failed-secondary text-failed-secondary focus:border-failed-secondary'
                : 'border-border-structural text-text-primary focus:border-border-accent'
            )}
          />
          {softErrors[cat] && (
            <span className="text-xs text-failed-secondary">Exceeds hard limit</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default BudgetCategoryTable
