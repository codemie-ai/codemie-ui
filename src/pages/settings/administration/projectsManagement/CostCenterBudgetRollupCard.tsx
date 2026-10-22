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

import { FC, ReactNode, useCallback, useEffect, useState } from 'react'

import Button from '@/components/Button'
import Hint from '@/components/Hint'
import Spinner from '@/components/Spinner'
import { ButtonSize } from '@/constants'
import { useAbortController } from '@/hooks/useAbortController'
import { costCentersStore } from '@/store/costCenters'
import {
  BUDGET_CATEGORY_OPTIONS,
  BudgetCategory,
  getBudgetCategoryLabel,
} from '@/types/entity/budget'
import { CostCenterAssignedBudgetSummary, CostCenterBudgetSummary } from '@/types/entity/costCenter'

import BudgetSpendMetrics from './components/BudgetSpendMetrics'
import { formatCurrency, formatResetPeriod } from './components/spendPresentation'

interface CostCenterBudgetRollupCardProps {
  costCenterId: string
  /** Linked-project count from the cost center detail; drives the "no projects linked" message. */
  projectCount: number
  /** Bump to force a refetch independent of the page's own loading/remount cycle. */
  refreshKey?: number
}

/**
 * A category only appears in `summary.budgets` when it has at least one row (accepted, excluded,
 * or unsynced). `max_budget` sums accepted rows only, so a category can be present with
 * `max_budget === 0` purely because every row was excluded or hasn't synced yet - that is not the
 * same as a genuine $0 hard limit (an accepted row whose limit happens to be zero).
 */
const hasAcceptedBudget = (data: CostCenterAssignedBudgetSummary): boolean =>
  data.max_budget > 0 ||
  (data.max_budget === 0 && data.unsynced_count === 0 && data.excluded_count === 0)

/** Note for a category that has accepted rows but also some dropped ones, e.g. "+1 pending sync". */
const pendingNote = (data: CostCenterAssignedBudgetSummary): string | null => {
  const notes: string[] = []
  if (data.unsynced_count > 0) notes.push(`${data.unsynced_count} pending sync`)
  if (data.excluded_count > 0)
    notes.push(`${data.excluded_count} excluded (different reset window)`)
  return notes.length ? `+${notes.join(', ')}` : null
}

const CategoryCard: FC<{
  category: BudgetCategory
  budgetData: CostCenterAssignedBudgetSummary | undefined
  projectCount: number
}> = ({ category, budgetData, projectCount }) => {
  // projectCount wins over a possibly-stale budget summary: a cost center with no linked
  // projects cannot have a real budget to show, whatever the (momentarily out of sync) figures say.
  const showCard = projectCount > 0 && budgetData != null && hasAcceptedBudget(budgetData)

  let emptyMessage = '— not assigned —'
  if (projectCount === 0) {
    emptyMessage = 'No projects linked'
  } else if (budgetData && !showCard) {
    // A negative max_budget is malformed backend data, not a sync-timing issue - say so
    // instead of reusing pendingNote's "pending sync"/"excluded" wording for it.
    emptyMessage =
      budgetData.max_budget < 0
        ? 'Invalid budget data'
        : pendingNote(budgetData)?.replace(/^\+/, '') ?? emptyMessage
  }

  return (
    <div className="flex min-h-[220px] min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <div className="text-sm font-medium text-text-primary">
        {getBudgetCategoryLabel(category)}
      </div>

      {!showCard || !budgetData ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-quaternary">
          {emptyMessage}
        </div>
      ) : (
        <>
          <BudgetSpendMetrics
            spent={budgetData.current_spending}
            max={budgetData.max_budget}
            soft={budgetData.soft_budget}
            remaining={Math.max(0, budgetData.max_budget - budgetData.current_spending)}
          />

          <div className="mt-auto text-xs text-text-quaternary">
            {budgetData.member_count} member{budgetData.member_count !== 1 ? 's' : ''},{' '}
            {formatCurrency(budgetData.allocated_member_budget_total)} allocated
            {pendingNote(budgetData) ? <div>{pendingNote(budgetData)}</div> : null}
          </div>
        </>
      )}
    </div>
  )
}

const CostCenterBudgetRollupCard: FC<CostCenterBudgetRollupCardProps> = ({
  costCenterId,
  projectCount,
  refreshKey,
}) => {
  const [summary, setSummary] = useState<CostCenterBudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { execute } = useAbortController()

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const data = await execute((signal) =>
        costCentersStore.getCostCenterBudgetSummary(costCenterId, signal)
      )
      // Aborted or superseded: a newer call is in flight (or already landed) and owns the
      // loading/error/summary state from here - touching it now would race that newer call.
      if (data === null) return
      setSummary(data)
      setLoading(false)
    } catch {
      setError(true)
      setLoading(false)
    }
  }, [costCenterId, execute])

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costCenterId, refreshKey])

  if (error) {
    return (
      <div className="rounded-lg border border-border-critical bg-surface-critical-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-text-critical">
            Failed to load cost center budget summary. Please try again later.
          </div>
          <Button size={ButtonSize.SMALL} onClick={loadSummary}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (loading || !summary) {
    return (
      <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-border-structural bg-surface-base-secondary p-4">
        <Spinner />
      </div>
    )
  }

  const budgetsList = summary.budgets ?? []
  const knownCategories = new Set(BUDGET_CATEGORY_OPTIONS.map((o) => o.value))

  // Only label the header with a reset period when every category that has one agrees on it -
  // computed here directly rather than inferred from budget_limit's null-ness, so the UI's own
  // invariant doesn't silently depend on a backend aggregation detail it can't see. The same set
  // also tells apart "nothing to sum" from "disagreeing reset periods" when budget_limit is null.
  const renderedBudgets = budgetsList.filter(
    (b) => projectCount > 0 && knownCategories.has(b.budget_category) && hasAcceptedBudget(b)
  )
  const distinctDurations = new Set(
    renderedBudgets.map((b) => b.budget_duration).filter((d): d is string => !!d)
  )
  // Independent of budget_limit's own null-ness: a disagreement in the categories' own
  // durations must surface this warning even if the backend ever returned a non-null
  // budget_limit alongside it - the invariant this UI relies on, made self-checking.
  const hasMixedPeriods = distinctDurations.size > 1
  const resetPeriod =
    summary.budget_limit != null && distinctDurations.size === 1
      ? formatResetPeriod(distinctDurations.values().next().value)
      : null
  const mixedPeriodsHint = hasMixedPeriods
    ? renderedBudgets
        .filter((b) => !!b.budget_duration)
        .map(
          (b) =>
            `${getBudgetCategoryLabel(b.budget_category)}: ${formatResetPeriod(b.budget_duration)}`
        )
        .join(', ')
    : null

  // "Spend" includes key spend (to match the project page) while the category cards only ever
  // show assigned-budget spend, so the two don't add up to the same total - surface the gap
  // rather than leave it unexplained. Sum only the rows that actually render a card (recognized
  // category, an accepted budget, and at least one linked project) - matching CategoryCard's own
  // showCard condition, so an unrecognized category, a pending-sync/excluded-only row, or a
  // cost center with no projects linked isn't silently absorbed into "key spend".
  const categorySpendTotal =
    projectCount === 0 ? 0 : renderedBudgets.reduce((sum, b) => sum + b.current_spending, 0)
  const keySpend = Math.round((summary.current_spending - categorySpendTotal) * 100) / 100

  let totalBudgetContent: ReactNode = '— not assigned —'
  if (hasMixedPeriods) {
    totalBudgetContent = (
      <>
        Not summed: different reset periods
        <Hint
          id="cost-center-budget-rollup-mixed-periods"
          hint={`Per-category reset periods: ${mixedPeriodsHint}`}
          position="bottom"
        />
      </>
    )
  } else if (summary.budget_limit != null && summary.budget_limit >= 0) {
    // A genuine $0 total is valid (mirrors the per-category zero-limit case); a negative total
    // is malformed data and falls through to "— not assigned —", like a negative max_budget does
    // at the category level.
    totalBudgetContent = formatCurrency(summary.budget_limit)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-text-quaternary mb-1">
              Total budget{resetPeriod ? ` · ${resetPeriod}` : ''}
            </div>
            <div className="text-base font-semibold">{totalBudgetContent}</div>
          </div>
          <div>
            <div className="text-xs text-text-quaternary mb-1">
              Spend
              {keySpend !== 0 && (
                <Hint
                  id="cost-center-budget-rollup-key-spend"
                  hint={
                    keySpend > 0
                      ? `Includes ${formatCurrency(keySpend)} API key spend`
                      : `Spend figures don't reconcile: category cards total ${formatCurrency(
                          Math.abs(keySpend)
                        )} more than this`
                  }
                  position="bottom"
                />
              )}
            </div>
            <div className="text-base font-semibold">
              {formatCurrency(summary.current_spending)}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-quaternary mb-1">% used</div>
            <div className="text-base font-semibold">
              {!hasMixedPeriods && summary.budget_limit != null && summary.budget_limit > 0
                ? `${summary.total_percent.toFixed(1)}%`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {BUDGET_CATEGORY_OPTIONS.map(({ value: category }) => (
          <CategoryCard
            key={category}
            category={category}
            budgetData={budgetsList.find((b) => b.budget_category === category)}
            projectCount={projectCount}
          />
        ))}
      </div>
    </div>
  )
}

export default CostCenterBudgetRollupCard
