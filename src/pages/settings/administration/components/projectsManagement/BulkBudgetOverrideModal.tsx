// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { BudgetCategory } from '@/types/entity/budget'
import {
  MemberAllocationOverridePayload,
  ProjectBudget,
  ProjectBudgetMemberAllocation,
} from '@/types/entity/projectBudget'
import { UserListItem } from '@/types/entity/user'

import {
  getNonNegativeLimitErrors,
  parseBudgetNumber,
  SOFT_EXCEEDS_HARD_MESSAGE,
} from './budgetNumber'
import BudgetOverrideCategoryCard, {
  BudgetAllocationState,
  formatBudgetMoney,
} from './BudgetOverrideCategoryCard'
import BudgetOverrideCategoryTable from './BudgetOverrideCategoryTable'

interface BulkBudgetOverrideUpdate {
  budgetId: string
  userId: string
  payload: MemberAllocationOverridePayload
}

interface BulkBudgetOverrideModalProps {
  visible: boolean
  users: UserListItem[]
  budgets: ProjectBudget[]
  budgetAllocationLookup: Record<
    string,
    Record<BudgetCategory, ProjectBudgetMemberAllocation>
  > | null
  onHide: () => void
  onSubmit: (updates: BulkBudgetOverrideUpdate[]) => Promise<void>
  onResetUsage?: (category?: BudgetCategory) => void
}

interface PendingCategoryValues {
  max: string
  soft: string
  reason: string
  maxDirty: boolean
  softDirty: boolean
  reasonDirty: boolean
}

type PendingValues = Record<BudgetCategory, PendingCategoryValues>
type CurrentCategoryValues = Record<BudgetCategory, { max: number[]; soft: number[] }>
type FieldErrors = { max?: string; soft?: string }

const categoryOptions = [
  { label: 'Platform', value: 'platform' as BudgetCategory },
  { label: 'CLI', value: 'cli' as BudgetCategory },
  { label: 'Premium models', value: 'premium_models' as BudgetCategory },
]

const emptyPendingValues = (): PendingValues =>
  Object.fromEntries(
    categoryOptions.map(({ value }) => [
      value,
      { max: '', soft: '', reason: '', maxDirty: false, softDirty: false, reasonDirty: false },
    ])
  ) as PendingValues

const getAllocationValue = (
  user: UserListItem,
  category: BudgetCategory,
  budgets: ProjectBudget[],
  lookup: BulkBudgetOverrideModalProps['budgetAllocationLookup'],
  field: 'max' | 'soft'
) => {
  const allocation = lookup?.[user.id]?.[category]
  const budgetAllocation = budgets
    .find((item) => item.budget_category === category)
    ?.member_allocations.find((item) => item.user_id === user.id)
  if (field === 'max')
    return allocation?.allocated_max_budget ?? budgetAllocation?.allocated_max_budget ?? 0
  return allocation?.allocated_soft_budget ?? budgetAllocation?.allocated_soft_budget ?? 0
}

const valuesAreEqual = (values: number[]) => values.every((value) => value === values[0])

const normalizeNumber = parseBudgetNumber

const getFieldDisplayValue = (
  dirty: boolean,
  value: string,
  mixed: boolean,
  currentValue: number | undefined
) => {
  if (dirty) return value
  if (mixed) return 'Mixed'
  return String(currentValue ?? '')
}

const isCategoryFieldDirty = (draftValue: string, draftDirty: boolean, currentValues: number[]) => {
  if (!draftDirty) return false
  if (!currentValues.length || !valuesAreEqual(currentValues)) return true
  return normalizeNumber(draftValue) !== currentValues[0]
}

const getSoftLimitError = (
  max: number | null,
  soft: number | null,
  current: { max: number[]; soft: number[] },
  maxDirty: boolean,
  softDirty: boolean,
  selectedCount: number
): string => {
  if (max == null || soft == null) return ''
  const effectiveMax = maxDirty ? Array.from({ length: selectedCount }, () => max) : current.max
  const effectiveSoft = softDirty ? Array.from({ length: selectedCount }, () => soft) : current.soft
  return effectiveSoft.some((value, index) => value > effectiveMax[index])
    ? SOFT_EXCEEDS_HARD_MESSAGE
    : ''
}

const getCapacityErrors = (
  draft: PendingCategoryValues,
  max: number | null,
  soft: number | null,
  available: { max: number | null; soft: number | null }
): FieldErrors => ({
  ...(draft.maxDirty && max != null && available.max != null && max > available.max
    ? { max: `Maximum available per user: ${formatBudgetMoney(available.max)}` }
    : {}),
  ...(draft.softDirty && soft != null && available.soft != null && soft > available.soft
    ? { soft: `Maximum available per user: ${formatBudgetMoney(available.soft)}` }
    : {}),
})

const BulkBudgetOverrideModal: FC<BulkBudgetOverrideModalProps> = ({
  visible,
  users,
  budgets,
  budgetAllocationLookup,
  onHide,
  onSubmit,
  onResetUsage,
}) => {
  const [pending, setPending] = useState<PendingValues>(emptyPendingValues)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentValuesByCategory = useMemo(
    () =>
      Object.fromEntries(
        categoryOptions.map(({ value }) => [
          value,
          {
            max: users.map((user) =>
              getAllocationValue(user, value, budgets, budgetAllocationLookup, 'max')
            ),
            soft: users.map((user) =>
              getAllocationValue(user, value, budgets, budgetAllocationLookup, 'soft')
            ),
          },
        ])
      ) as CurrentCategoryValues,
    [budgetAllocationLookup, budgets, users]
  )
  const getCategoryValues = (category: BudgetCategory) => currentValuesByCategory[category]

  const getAllocationState = (category: BudgetCategory): BudgetAllocationState => {
    const fixedCount = users.filter(
      (user) => budgetAllocationLookup?.[user.id]?.[category]?.allocation_mode === 'fixed'
    ).length
    if (fixedCount === 0) return 'project'
    if (fixedCount === users.length) return 'override'
    return 'mixed'
  }

  const categoryDirty = useMemo(
    () =>
      Object.fromEntries(
        categoryOptions.map(({ value }) => {
          const draft = pending[value]
          const current = currentValuesByCategory[value]
          return [
            value,
            isCategoryFieldDirty(draft.max, draft.maxDirty, current.max) ||
              isCategoryFieldDirty(draft.soft, draft.softDirty, current.soft),
          ]
        })
      ) as Record<BudgetCategory, boolean>,
    [currentValuesByCategory, pending]
  )
  const isDirty = Object.values(categoryDirty).some(Boolean)

  const availableCapacityByCategory = useMemo(() => {
    const selectedIds = new Set(users.map((user) => user.id))
    return Object.fromEntries(
      categoryOptions.map(({ value }) => {
        const budget = budgets.find((item) => item.budget_category === value)
        if (!budget) return [value, { max: null, soft: null }]
        const outsideFixed = budget.member_allocations.filter(
          (allocation) =>
            allocation.allocation_mode === 'fixed' && !selectedIds.has(allocation.user_id)
        )
        const outsideFixedHard = outsideFixed.reduce(
          (total, allocation) => total + allocation.allocated_max_budget,
          0
        )
        const outsideFixedSoft = outsideFixed.reduce(
          (total, allocation) => total + allocation.allocated_soft_budget,
          0
        )
        const selectedCount = Math.max(users.length, 1)
        return [
          value,
          {
            max: Math.max(0, (budget.max_budget - outsideFixedHard) / selectedCount),
            soft: Math.max(0, (budget.soft_budget - outsideFixedSoft) / selectedCount),
          },
        ]
      })
    ) as Record<BudgetCategory, { max: number | null; soft: number | null }>
  }, [budgets, users])

  const validationByCategory = useMemo(() => {
    const result = {} as Record<BudgetCategory, FieldErrors>
    categoryOptions.forEach(({ value }) => {
      result[value] = {}
      if (!categoryDirty[value]) {
        return
      }
      const draft = pending[value]
      const current = currentValuesByCategory[value]
      const nextMax = draft.maxDirty ? normalizeNumber(draft.max) : current.max[0]
      const nextSoft = draft.softDirty ? normalizeNumber(draft.soft) : current.soft[0]
      const numberErrors = getNonNegativeLimitErrors(nextMax, nextSoft)
      const softLimitError = getSoftLimitError(
        nextMax,
        nextSoft,
        current,
        draft.maxDirty,
        draft.softDirty,
        users.length
      )
      const budget = budgets.find((item) => item.budget_category === value)
      const allocations = budget?.member_allocations
      if (!budget || !Array.isArray(allocations)) {
        result[value] = {
          ...numberErrors,
          ...(softLimitError ? { soft: softLimitError } : {}),
        }
        return
      }
      result[value] = {
        ...numberErrors,
        ...(softLimitError ? { soft: softLimitError } : {}),
        ...getCapacityErrors(draft, nextMax, nextSoft, availableCapacityByCategory[value]),
      }
    })
    return result
  }, [availableCapacityByCategory, budgets, categoryDirty, currentValuesByCategory, pending])
  const hasInvalidPendingCategory = Object.values(validationByCategory).some((fieldErrors) =>
    Boolean(fieldErrors.max || fieldErrors.soft)
  )

  useEffect(() => {
    if (!visible) return
    setPending(emptyPendingValues())
    setIsSubmitting(false)
    // Initialize only when the modal opens so external budget refreshes do not
    // discard edits already made in the bulk form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const updateCategory = (
    category: BudgetCategory,
    field: 'max' | 'soft' | 'reason',
    value: string
  ) => {
    if (field === 'reason') {
      setPending(
        (current) =>
          Object.fromEntries(
            categoryOptions.map(({ value: item }) => [
              item,
              { ...current[item], reason: value, reasonDirty: true },
            ])
          ) as PendingValues
      )
      return
    }
    setPending((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [field]: value,
        [`${field}Dirty`]: true,
      },
    }))
  }

  const handleSubmit = async () => {
    if (!isDirty || hasInvalidPendingCategory) return
    const updates = categoryOptions.flatMap(({ value }) => {
      if (!categoryDirty[value]) return []
      const budget = budgets.find((item) => item.budget_category === value)
      if (!budget) return []
      const draft = pending[value]
      return users.map((user) => ({
        budgetId: budget.budget_id,
        userId: user.id,
        payload: {
          allocated_max_budget: draft.maxDirty
            ? normalizeNumber(draft.max) ?? 0
            : getAllocationValue(user, value, budgets, budgetAllocationLookup, 'max'),
          allocated_soft_budget: draft.softDirty
            ? normalizeNumber(draft.soft) ?? 0
            : getAllocationValue(user, value, budgets, budgetAllocationLookup, 'soft'),
          ...(draft.reasonDirty ? { override_reason: draft.reason || null } : {}),
        },
      }))
    })

    setIsSubmitting(true)
    try {
      await onSubmit(updates)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={`Budget Override — ${users.length} users`}
      limitWidth
      className="w-full !max-w-3xl"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      withBorderBottom={false}
      footerContent={
        <div className="flex w-full items-center justify-between gap-3">
          {onResetUsage ? (
            <Button
              size={ButtonSize.SMALL}
              variant={ButtonType.SECONDARY}
              onClick={() => onResetUsage()}
              disabled={isSubmitting}
            >
              Reset budget usage for {users.length} users
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button
              size={ButtonSize.SMALL}
              variant={ButtonType.SECONDARY}
              onClick={onHide}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size={ButtonSize.SMALL}
              variant={ButtonType.PRIMARY}
              onClick={handleSubmit}
              disabled={isSubmitting || !isDirty || hasInvalidPendingCategory}
            >
              Save Override
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-text-quaternary">
          Mixed values remain unchanged unless edited.
        </div>

        <BudgetOverrideCategoryTable hasActionRow={false}>
          {categoryOptions
            .filter(({ value }) => budgets.some((budget) => budget.budget_category === value))
            .map(({ value }) => {
              const current = getCategoryValues(value)
              const values = pending[value]
              const maxMixed = !valuesAreEqual(current.max)
              const softMixed = !valuesAreEqual(current.soft)
              const fieldErrors = validationByCategory[value]
              const revertField = (field: 'max' | 'soft') =>
                setPending((currentPending) => ({
                  ...currentPending,
                  [value]: {
                    ...currentPending[value],
                    [field]: '',
                    [`${field}Dirty`]: false,
                  },
                }))
              return (
                <BudgetOverrideCategoryCard
                  key={value}
                  category={value}
                  maxValue={getFieldDisplayValue(
                    values.maxDirty,
                    values.max,
                    maxMixed,
                    current.max[0]
                  )}
                  softValue={getFieldDisplayValue(
                    values.softDirty,
                    values.soft,
                    softMixed,
                    current.soft[0]
                  )}
                  maxAvailable={availableCapacityByCategory[value].max}
                  softAvailable={availableCapacityByCategory[value].soft}
                  availableLabel="Max available per user"
                  maxError={fieldErrors.max}
                  softError={fieldErrors.soft}
                  maxDirty={values.maxDirty}
                  softDirty={values.softDirty}
                  allocationState={getAllocationState(value)}
                  hasActionRow={false}
                  maxId={`bulk-${value}-max`}
                  softId={`bulk-${value}-soft`}
                  onMaxChange={(nextValue) => updateCategory(value, 'max', nextValue)}
                  onSoftChange={(nextValue) => updateCategory(value, 'soft', nextValue)}
                  onMaxFocus={() => {
                    if (!values.maxDirty) updateCategory(value, 'max', '')
                  }}
                  onSoftFocus={() => {
                    if (!values.softDirty) updateCategory(value, 'soft', '')
                  }}
                  onRevert={revertField}
                />
              )
            })}
        </BudgetOverrideCategoryTable>
        <Input
          id="bulk_override_reason"
          label="Override reason"
          value={pending.platform.reason}
          onChange={(event) => updateCategory('platform', 'reason', event.target.value)}
          placeholder="Reason for this override (optional)"
          aria-label="Override reason"
        />
      </div>
    </Popup>
  )
}

export default BulkBudgetOverrideModal
