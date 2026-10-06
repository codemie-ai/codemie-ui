// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'

import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import { ProjectBudgetMemberAllocation } from '@/types/entity/projectBudget'
import { UserListItem } from '@/types/entity/user'

import BudgetOverrideIndicator from './BudgetOverrideIndicator'
import { formatCurrency, getSpendColorFromValues } from './spendPresentation'

export const BUDGET_CATEGORIES: BudgetCategory[] = ['platform', 'cli', 'premium_models']

export type BudgetAllocationLookup = Record<
  string,
  Record<BudgetCategory, ProjectBudgetMemberAllocation>
> | null

export const getUserBudgetUsage = (
  user: UserListItem,
  budgetAllocationLookup: BudgetAllocationLookup,
  category: BudgetCategory
): number | null => {
  const assignment = user.budget_assignments?.find((item) => item.category === category)
  const allocation = budgetAllocationLookup?.[user.id]?.[category]
  const spent = assignment?.current_spending ?? null
  const limit = assignment?.max_budget ?? allocation?.allocated_max_budget
  return spent != null && limit != null && limit > 0 ? (spent / limit) * 100 : null
}

interface UserBudgetsCellProps {
  user: UserListItem
  enforceMemberSpendLimits: boolean
  budgetAllocationLookup: BudgetAllocationLookup
  onOverride: (userId: string, category: BudgetCategory) => void
}

const UserBudgetsCell: FC<UserBudgetsCellProps> = ({
  user,
  enforceMemberSpendLimits,
  budgetAllocationLookup,
  onOverride,
}) => {
  if (!enforceMemberSpendLimits) {
    return <span className="text-xs text-text-quaternary">Not enforced</span>
  }
  const rows = BUDGET_CATEGORIES.filter(
    (cat) =>
      user.budget_assignments?.some((item) => item.category === cat) ||
      budgetAllocationLookup?.[user.id]?.[cat]
  )
  if (!rows.length) {
    return <span className="text-xs text-text-quaternary">-</span>
  }
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((cat) => {
        const assignment = user.budget_assignments?.find((item) => item.category === cat)
        const alloc = budgetAllocationLookup?.[user.id]?.[cat]
        const isFixed = alloc?.allocation_mode === 'fixed'
        const usage = assignment?.current_spending ?? null
        const limit = assignment?.max_budget ?? alloc?.allocated_max_budget
        const spendColor = getSpendColorFromValues(usage, limit)
        return (
          <button
            key={cat}
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded px-1 -mx-1 text-left text-xs transition-colors hover:bg-surface-specific-dropdown-hover"
            onClick={(e) => {
              e.stopPropagation()
              onOverride(user.id, cat)
            }}
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Click to override allocation"
          >
            <span className="text-text-quaternary w-32 shrink-0 whitespace-nowrap">
              {getBudgetCategoryLabel(cat)}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-text-primary tabular-nums">
              <span className="shrink-0" style={spendColor ? { color: spendColor } : undefined}>
                {formatCurrency(usage, '-')}
              </span>
              <span className="text-text-secondary">/</span>
              <span className="shrink-0 text-text-secondary">{formatCurrency(limit, '-')}</span>
              {isFixed && <BudgetOverrideIndicator />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default UserBudgetsCell
