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

import {
  getNonNegativeLimitErrors,
  parseBudgetNumber,
  SOFT_EXCEEDS_HARD_MESSAGE,
} from '../../components/projectsManagement/budgetNumber'
import BudgetOverrideCategoryCard, {
  formatBudgetMoney,
  BudgetOverrideField,
} from '../../components/projectsManagement/BudgetOverrideCategoryCard'
import BudgetOverrideCategoryTable from '../../components/projectsManagement/BudgetOverrideCategoryTable'

export interface MemberAllocationOverrideUpdate {
  budgetId: string
  userId: string
  payload: MemberAllocationOverridePayload
  removeOverride?: boolean
}

interface MemberAllocationOverrideModalProps {
  visible: boolean
  userId: string | null
  userName: string | null
  budgets: ProjectBudget[]
  userAllocationsByCategory: Record<string, ProjectBudgetMemberAllocation> | null
  initialCategory?: BudgetCategory | null
  dismissLabel?: string
  onHide: () => void
  onSubmit: (updates: MemberAllocationOverrideUpdate[]) => Promise<void>
  onResetUsage?: (userId: string) => Promise<void>
}

type LimitField = 'max' | 'soft'
type Draft = Record<BudgetCategory, { max: string; soft: string }>
type Errors = Record<BudgetCategory, { max?: string; soft?: string }>
type Touched = Record<BudgetCategory, { max: boolean; soft: boolean }>

const CATEGORIES: BudgetCategory[] = ['platform', 'cli', 'premium_models']

const normalizeNumber = parseBudgetNumber

const emptyDraft = (): Draft =>
  Object.fromEntries(CATEGORIES.map((category) => [category, { max: '', soft: '' }])) as Draft

const emptyTouched = (): Touched =>
  Object.fromEntries(
    CATEGORIES.map((category) => [category, { max: false, soft: false }])
  ) as Touched

const MemberAllocationOverrideModal: FC<MemberAllocationOverrideModalProps> = ({
  visible,
  userId,
  userName,
  budgets,
  userAllocationsByCategory,
  initialCategory: _initialCategory,
  dismissLabel = 'Cancel',
  onHide,
  onSubmit,
  onResetUsage,
}) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [initialDraft, setInitialDraft] = useState<Draft>(emptyDraft)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Errors>({} as Errors)
  const [touched, setTouched] = useState<Touched>(emptyTouched)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clearedCategories, setClearedCategories] = useState<BudgetCategory[]>([])

  const budgetByCategory = useMemo(
    () => new Map(budgets.map((budget) => [budget.budget_category, budget])),
    [budgets]
  )

  const initialValues = useMemo(() => {
    const values = emptyDraft()
    CATEGORIES.forEach((category) => {
      const budget = budgetByCategory.get(category)
      const allocation = userAllocationsByCategory?.[category]
      values[category] = {
        max: String(allocation?.allocated_max_budget ?? budget?.max_budget ?? 0),
        soft: String(allocation?.allocated_soft_budget ?? budget?.soft_budget ?? 0),
      }
    })
    return values
  }, [budgetByCategory, userAllocationsByCategory])

  useEffect(() => {
    if (!visible || !userId) return
    setDraft(initialValues)
    setInitialDraft(initialValues)
    setReason('')
    setErrors({} as Errors)
    setTouched(emptyTouched())
    setClearedCategories([])
    // Initialize when the modal opens or switches user. A budget refresh after
    // an inline category reset must not discard edits in other categories.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, visible])

  const getChangedCategories = (values: Draft = draft) =>
    CATEGORIES.filter(
      (category) =>
        clearedCategories.includes(category) ||
        normalizeNumber(values[category].max) !== normalizeNumber(initialDraft[category].max) ||
        normalizeNumber(values[category].soft) !== normalizeNumber(initialDraft[category].soft)
    )

  const changedCategories = useMemo(
    () => getChangedCategories(),
    [draft, initialDraft, clearedCategories]
  )
  const isDirty = changedCategories.length > 0
  const hasValidationErrors = Object.values(errors).some(
    (categoryErrors) => categoryErrors && Object.values(categoryErrors).some(Boolean)
  )
  const hasFixedOverride = (category: BudgetCategory) =>
    userAllocationsByCategory?.[category]?.allocation_mode === 'fixed' &&
    !clearedCategories.includes(category)
  const hasAnyOverride = CATEGORIES.some((category) => hasFixedOverride(category))

  const getAllocationState = (category: BudgetCategory) => {
    if (clearedCategories.includes(category)) return 'pending-project' as const
    return hasFixedOverride(category) ? ('override' as const) : ('project' as const)
  }

  const getAvailableCapacity = (category: BudgetCategory, field: BudgetOverrideField) => {
    const budget = budgetByCategory.get(category)
    if (!budget) return null
    const reserved = budget.member_allocations
      .filter((item) => item.allocation_mode === 'fixed' && item.user_id !== userId)
      .reduce(
        (total, item) =>
          total + (field === 'max' ? item.allocated_max_budget : item.allocated_soft_budget),
        0
      )
    return Math.max(0, (field === 'max' ? budget.max_budget : budget.soft_budget) - reserved)
  }

  const getValidationErrors = (nextDraft: Draft, onlyTouched = false) => {
    const nextErrors = {} as Errors
    getChangedCategories(nextDraft).forEach((category) => {
      if (clearedCategories.includes(category)) return
      if (onlyTouched && !touched[category].max && !touched[category].soft) {
        return
      }
      const hard = normalizeNumber(nextDraft[category].max)
      const soft = normalizeNumber(nextDraft[category].soft)
      const categoryErrors: { max?: string; soft?: string } = getNonNegativeLimitErrors(hard, soft)
      if (!categoryErrors.soft && hard != null && soft != null && soft > hard) {
        categoryErrors.soft = SOFT_EXCEEDS_HARD_MESSAGE
      }
      const maxAvailable = getAvailableCapacity(category, 'max')
      if (!categoryErrors.max && hard != null && maxAvailable != null && hard > maxAvailable) {
        categoryErrors.max = `Maximum available: ${formatBudgetMoney(maxAvailable)}`
      }
      const softAvailable = getAvailableCapacity(category, 'soft')
      if (!categoryErrors.soft && soft != null && softAvailable != null && soft > softAvailable) {
        categoryErrors.soft = `Maximum available: ${formatBudgetMoney(softAvailable)}`
      }
      if (Object.keys(categoryErrors).length) nextErrors[category] = categoryErrors
    })
    return nextErrors
  }

  useEffect(() => {
    setErrors(getValidationErrors(draft, true))
    // Validation intentionally follows the edited draft and existing budget capacity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, touched, budgets, userAllocationsByCategory, userId, clearedCategories])

  const validate = () => {
    const nextErrors = getValidationErrors(draft)
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const updateField = (category: BudgetCategory, field: LimitField, value: string) => {
    setDraft((current) => ({ ...current, [category]: { ...current[category], [field]: value } }))
    setTouched((current) => ({
      ...current,
      [category]: { ...current[category], [field]: true },
    }))
  }

  const revertField = (category: BudgetCategory, field: LimitField) => {
    setDraft((current) => ({
      ...current,
      [category]: { ...current[category], [field]: initialDraft[category][field] },
    }))
    setTouched((current) => ({
      ...current,
      [category]: { ...current[category], [field]: false },
    }))
    setErrors((current) => ({
      ...current,
      [category]: { ...current[category], [field]: undefined },
    }))
  }

  const handleSubmit = async () => {
    if (!userId || !isDirty || !validate()) return
    setIsSubmitting(true)
    try {
      const updates = changedCategories.flatMap((category) => {
        const budget = budgetByCategory.get(category)
        if (!budget) return []
        const values = draft[category]
        return [
          {
            budgetId: budget.budget_id,
            userId,
            payload: {
              allocated_max_budget: normalizeNumber(values.max) ?? 0,
              allocated_soft_budget: normalizeNumber(values.soft) ?? 0,
              override_reason: reason.trim() || null,
            },
            removeOverride: clearedCategories.includes(category),
          },
        ]
      })
      await onSubmit(updates)
      onHide()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUseProjectAllocation = (category: BudgetCategory) => {
    const budget = budgetByCategory.get(category)
    if (!budget) return
    const previousAllocation = userAllocationsByCategory?.[category]
    if (!previousAllocation || previousAllocation.allocation_mode !== 'fixed') return
    setDraft((current) => ({
      ...current,
      [category]: { max: String(budget.max_budget), soft: String(budget.soft_budget) },
    }))
    setTouched((current) => ({ ...current, [category]: { max: false, soft: false } }))
    setErrors((current) => ({ ...current, [category]: {} }))
    setClearedCategories((current) =>
      current.includes(category) ? current : [...current, category]
    )
  }

  const handleRevertProjectAllocation = (category: BudgetCategory) => {
    setClearedCategories((current) => current.filter((item) => item !== category))
    setDraft((current) => ({ ...current, [category]: { ...initialDraft[category] } }))
    setTouched((current) => ({ ...current, [category]: { max: false, soft: false } }))
    setErrors((current) => ({ ...current, [category]: {} }))
  }

  const handleCategoryAction = (category: BudgetCategory) => {
    if (clearedCategories.includes(category)) {
      handleRevertProjectAllocation(category)
      return
    }
    handleUseProjectAllocation(category)
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={`Budget Override — ${userName || userId || ''}`}
      footerContent={
        <div className="flex w-full items-center justify-between gap-3">
          {onResetUsage ? (
            <Button
              size={ButtonSize.SMALL}
              variant={ButtonType.SECONDARY}
              onClick={() => onResetUsage(userId || '')}
              disabled={isSubmitting}
            >
              Reset budget usage
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
              {dismissLabel}
            </Button>
            <Button
              size={ButtonSize.SMALL}
              variant={ButtonType.PRIMARY}
              onClick={handleSubmit}
              disabled={isSubmitting || !isDirty || hasValidationErrors}
            >
              {isSubmitting ? 'Saving…' : 'Save Override'}
            </Button>
          </div>
        </div>
      }
      limitWidth
      className="w-full !max-w-3xl"
      bodyClassName="max-h-[70vh] overflow-y-auto"
      withBorderBottom={false}
    >
      <div className="space-y-4">
        <BudgetOverrideCategoryTable hasActionRow={hasAnyOverride}>
          {CATEGORIES.filter((category) => budgetByCategory.has(category)).map((category) => {
            const categoryErrors = errors[category] ?? {}
            const maxDirty =
              normalizeNumber(draft[category].max) !== normalizeNumber(initialDraft[category].max)
            const softDirty =
              normalizeNumber(draft[category].soft) !== normalizeNumber(initialDraft[category].soft)

            return (
              <BudgetOverrideCategoryCard
                key={category}
                category={category}
                maxValue={draft[category].max}
                softValue={draft[category].soft}
                maxAvailable={getAvailableCapacity(category, 'max')}
                softAvailable={getAvailableCapacity(category, 'soft')}
                maxError={categoryErrors.max}
                softError={categoryErrors.soft}
                maxDirty={maxDirty}
                softDirty={softDirty}
                maxId={`${category}-max-budget`}
                softId={`${category}-soft-budget`}
                onMaxChange={(value) => updateField(category, 'max', value)}
                onSoftChange={(value) => updateField(category, 'soft', value)}
                onRevert={(field) => revertField(category, field)}
                allocationState={getAllocationState(category)}
                hasActionRow={hasAnyOverride}
                resetDisabled={isSubmitting}
                onCategoryAction={
                  hasFixedOverride(category) || clearedCategories.includes(category)
                    ? () => handleCategoryAction(category)
                    : undefined
                }
              />
            )
          })}
        </BudgetOverrideCategoryTable>
        <Input
          id="override_reason"
          label="Override reason"
          placeholder="Reason for this override (optional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Popup>
  )
}

export default MemberAllocationOverrideModal
