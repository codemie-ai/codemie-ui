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
import { SpendQualification } from '@/types/analytics'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import { formatSpendQualificationSuffix } from '@/utils/analyticsFormatters'
import { formatCurrency, formatSpend } from '@/utils/currency'

const BUDGET_CATEGORY_ORDER: BudgetCategory[] = ['platform', 'cli', 'premium_models']

export interface BudgetSpendCellItem extends SpendQualification {
  key: string
  category: BudgetCategory
  max_budget?: number | null
  current_spending?: number | null
  tooltip?: string
}

interface BudgetSpendCellProps {
  items?: BudgetSpendCellItem[] | null
}

/**
 * One qualification over several parts, mirroring `combine_rendered_spend` in the backend's
 * `service/spend/rendering.py` so a total means the same thing on both sides of the wire.
 *
 * Two different holes make a total less than whole and both must be reported: a part that says it
 * is partial or has no coverage, and a part whose figure is absent entirely while others resolved -
 * the second is the one this cell used to produce silently, summing the parts that happened to
 * resolve into something indistinguishable from a whole total. The missing amount is summed only
 * when every partial part knows its own, because a hole whose size nobody knows must not be
 * reported as the computable half of itself.
 */
const combineQualifications = (items: BudgetSpendCellItem[]): SpendQualification => {
  const partials = items.filter((item) => item.spend_partial)
  const knownMissingAmounts = partials
    .map((item) => item.spend_missing_amount)
    .filter((amount): amount is number => amount != null)
  const hasAnyFigure = items.some((item) => item.current_spending != null)
  const hasAbsentFigure = items.some((item) => item.current_spending == null)
  const missingAmountIsUnknown =
    partials.some((item) => item.spend_missing_amount == null) || !knownMissingAmounts.length

  return {
    spend_unavailable: items.some((item) => item.spend_unavailable === true),
    spend_partial: partials.length > 0 || (hasAnyFigure && hasAbsentFigure),
    spend_missing_amount: missingAmountIsUnknown
      ? null
      : knownMissingAmounts.reduce((sum, amount) => sum + amount, 0),
  }
}

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
  const qualifiedTotalSpend =
    totalSpend + formatSpendQualificationSuffix(combineQualifications(budgets))
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
          {qualifiedTotalSpend} / {formatSpend(hasBudgetLimit ? totalBudgetRaw : null)}
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
              {formatSpend(budget.current_spending) + formatSpendQualificationSuffix(budget)} /{' '}
              {formatSpend(budget.max_budget)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default BudgetSpendCell
