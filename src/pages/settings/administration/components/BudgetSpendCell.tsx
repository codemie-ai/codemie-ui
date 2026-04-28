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

import { getHardLimitSpendColor } from '@/pages/settings/administration/projectsManagement/components/budgetSpending'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'

const BUDGET_CATEGORY_ORDER: BudgetCategory[] = ['platform', 'cli', 'premium_models']

export interface BudgetSpendCellItem {
  key: string
  category: BudgetCategory
  max_budget?: number | null
  current_spending?: number | null
  tooltip?: string
}

interface BudgetSpendCellProps {
  items?: BudgetSpendCellItem[] | null
}

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatSpend = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)

const formatBudget = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)

const BudgetSpendCell: FC<BudgetSpendCellProps> = ({ items }) => {
  const budgets = [...(items ?? [])].sort(
    (left, right) =>
      BUDGET_CATEGORY_ORDER.indexOf(left.category) - BUDGET_CATEGORY_ORDER.indexOf(right.category)
  )

  if (budgets.length === 0) {
    return <span className="text-text-primary">-</span>
  }

  const trackedSpends = budgets
    .map((budget) => budget.current_spending)
    .filter((value): value is number => value != null)
  const totalBudgetRaw = budgets.reduce((sum, budget) => sum + (budget.max_budget ?? 0), 0)
  const hasBudgetLimit = budgets.some((budget) => budget.max_budget != null)
  const totalSpend = trackedSpends.length
    ? formatCurrency(trackedSpends.reduce((sum, value) => sum + value, 0))
    : '-'
  const totalSpendRaw = trackedSpends.reduce((sum, value) => sum + value, 0)
  const totalColor =
    trackedSpends.length > 0
      ? getHardLimitSpendColor(totalSpendRaw, hasBudgetLimit ? totalBudgetRaw : null)
      : undefined

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-left w-full px-1 -mx-1">
        <span className="text-text-quaternary w-28 shrink-0 break-words">Total</span>
        <span
          className="whitespace-nowrap text-text-primary"
          style={totalColor ? { color: totalColor } : undefined}
        >
          {totalSpend} / {formatBudget(hasBudgetLimit ? totalBudgetRaw : null)}
        </span>
      </div>
      {budgets.map((budget) => {
        const budgetColor =
          budget.current_spending != null
            ? getHardLimitSpendColor(budget.current_spending, budget.max_budget)
            : undefined

        return (
          <div
            key={budget.key}
            className="flex items-center gap-2 text-[10px] text-left w-full px-1 -mx-1"
            data-tooltip-id={budget.tooltip ? 'react-tooltip' : undefined}
            data-tooltip-content={budget.tooltip}
          >
            <span className="text-text-quaternary w-28 shrink-0 break-words">
              {getBudgetCategoryLabel(budget.category)}
            </span>
            <span
              className="text-text-primary whitespace-nowrap"
              style={budgetColor ? { color: budgetColor } : undefined}
            >
              {formatSpend(budget.current_spending)} / {formatBudget(budget.max_budget)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default BudgetSpendCell
