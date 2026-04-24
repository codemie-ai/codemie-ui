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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC, useEffect, useMemo, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select/Select'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import {
  MemberAllocationOverridePayload,
  ProjectBudget,
  ProjectBudgetMemberAllocation,
} from '@/types/entity/projectBudget'

interface MemberAllocationOverrideModalProps {
  visible: boolean
  userId: string | null
  budgets: ProjectBudget[]
  userAllocationsByCategory: Record<string, ProjectBudgetMemberAllocation> | null
  initialCategory?: BudgetCategory | null
  onHide: () => void
  onSubmit: (
    budgetId: string,
    userId: string,
    payload: MemberAllocationOverridePayload
  ) => Promise<void>
  onClearOverride: (budgetId: string, userId: string) => Promise<void>
}

interface OverrideFormValues {
  max_budget: number
  soft_budget: number
  override_reason: string
}

const validationSchema = Yup.object({
  max_budget: Yup.number()
    .typeError('Hard limit must be a number')
    .min(0, 'Hard limit cannot be negative')
    .required('Hard limit is required'),
  soft_budget: Yup.number()
    .typeError('Soft limit must be a number')
    .min(0, 'Soft limit cannot be negative')
    .required('Soft limit is required')
    .test('soft-lte-hard', 'Soft limit cannot exceed hard limit', function (value) {
      return value === undefined || value <= (this.parent.max_budget ?? Infinity)
    }),
  override_reason: Yup.string().default(''),
})

const MemberAllocationOverrideModal: FC<MemberAllocationOverrideModalProps> = ({
  visible,
  userId,
  budgets,
  userAllocationsByCategory,
  initialCategory,
  onHide,
  onSubmit,
  onClearOverride,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)

  const categoryOptions = useMemo(
    () =>
      (budgets ?? []).map((b) => ({
        label: getBudgetCategoryLabel(b.budget_category),
        value: b.budget_category,
      })),
    [budgets]
  )

  const selectedBudget = useMemo(
    () => (budgets ?? []).find((b) => b.budget_category === selectedCategory) ?? null,
    [budgets, selectedCategory]
  )

  const currentAllocation = selectedCategory
    ? userAllocationsByCategory?.[selectedCategory] ?? null
    : null
  const isFixed = currentAllocation?.allocation_mode === 'fixed'

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OverrideFormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: { max_budget: 0, soft_budget: 0, override_reason: '' },
  })

  // Set default category on open
  useEffect(() => {
    if (!visible) return
    setSelectedCategory(initialCategory ?? (budgets ?? [])[0]?.budget_category ?? null)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form when category changes
  useEffect(() => {
    if (!visible || !selectedCategory) return
    const alloc = userAllocationsByCategory?.[selectedCategory]
    reset({
      max_budget: alloc?.allocated_max_budget ?? selectedBudget?.max_budget ?? 0,
      soft_budget: alloc?.allocated_soft_budget ?? selectedBudget?.soft_budget ?? 0,
      override_reason: '',
    })
  }, [visible, selectedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSubmit: SubmitHandler<OverrideFormValues> = async (data) => {
    if (!userId || !selectedBudget) return
    await onSubmit(selectedBudget.budget_id, userId, {
      allocated_max_budget: Number(data.max_budget),
      allocated_soft_budget: Number(data.soft_budget),
      override_reason: data.override_reason || null,
    })
    reset()
  }

  const handleClear = async () => {
    if (!userId || !selectedBudget) return
    await onClearOverride(selectedBudget.budget_id, userId)
  }

  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <div>
        {isFixed && (
          <Button
            size={ButtonSize.SMALL}
            variant={ButtonType.SECONDARY}
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear Override
          </Button>
        )}
      </div>
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
          onClick={handleSubmit(handleFormSubmit)}
          disabled={isSubmitting}
        >
          Save Override
        </Button>
      </div>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={`Budget Override — ${userId ?? ''}`}
      footerContent={footerContent}
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {categoryOptions.length > 1 && (
          <Select
            id="budget_category"
            label="Budget category:"
            required
            value={selectedCategory ?? ''}
            options={categoryOptions}
            onChangeValue={(value) => setSelectedCategory(value as BudgetCategory)}
          />
        )}

        {categoryOptions.length === 1 && (
          <div>
            <div className="text-xs text-text-quaternary mb-1">Budget category</div>
            <div className="text-xs text-text-primary">
              {getBudgetCategoryLabel(selectedCategory ?? budgets[0]?.budget_category)}
            </div>
          </div>
        )}

        {isFixed && (
          <div className="text-xs text-text-warning">
            ★ This member currently has a fixed (manually overridden) allocation.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="max_budget"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="max_budget"
                label="Hard limit:"
                required
                type="number"
                min="0"
                step="0.01"
                error={errors.max_budget?.message}
              />
            )}
          />
          <Controller
            name="soft_budget"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="soft_budget"
                label="Soft limit:"
                required
                type="number"
                min="0"
                step="0.01"
                error={errors.soft_budget?.message}
              />
            )}
          />
        </div>

        <Controller
          name="override_reason"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="override_reason"
              label="Override reason:"
              placeholder="Reason for this override (optional)"
              rows={3}
              error={errors.override_reason?.message}
            />
          )}
        />
      </form>
    </Popup>
  )
}

export default MemberAllocationOverrideModal
