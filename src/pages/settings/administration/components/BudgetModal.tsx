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
import { FC, useEffect } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select/Select'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import {
  BUDGET_CATEGORY_OPTIONS,
  Budget,
  BudgetCategory,
  BudgetPayload,
} from '@/types/entity/budget'

interface BudgetModalProps {
  visible: boolean
  budget?: Budget | null
  onHide: () => void
  onSubmit: (payload: BudgetPayload) => Promise<void>
}

interface BudgetFormValues {
  budget_id: string
  name: string
  description: string
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_category: BudgetCategory
}

const BUDGET_ID_REGEX = /^[a-zA-Z0-9_-]+$/

const BUDGET_RESET_PERIOD_OPTIONS = [
  { label: 'daily', value: '1d' },
  { label: 'weekly', value: '7d' },
  { label: 'monthly', value: '30d' },
]

const validationSchema = Yup.object({
  budget_id: Yup.string()
    .required('Budget ID is required')
    .matches(BUDGET_ID_REGEX, "Use letters, numbers, '-' and '_' only")
    .defined(),
  name: Yup.string().required('Name is required').defined(),
  description: Yup.string().default(''),
  soft_budget: Yup.number()
    .transform((value, originalValue) =>
      originalValue === '' || originalValue == null ? 0 : value
    )
    .typeError('Soft limit must be a number')
    .min(0, 'Soft limit cannot be negative')
    .default(0),
  max_budget: Yup.number()
    .typeError('Hard limit must be a number')
    .positive('Hard limit must be greater than zero')
    .required('Hard limit is required')
    .test('max-budget', 'Hard limit must be greater than or equal to soft limit', function (value) {
      return value === undefined || value >= (this.parent.soft_budget ?? 0)
    }),
  budget_duration: Yup.string()
    .required('Reset period is required')
    .oneOf(
      BUDGET_RESET_PERIOD_OPTIONS.map((o) => o.value),
      'Please select a valid reset period'
    )
    .defined(),
  budget_category: Yup.mixed<BudgetCategory>()
    .oneOf(BUDGET_CATEGORY_OPTIONS.map((option) => option.value))
    .required('Category is required')
    .defined(),
})

const BudgetModal: FC<BudgetModalProps> = ({ visible, budget, onHide, onSubmit }) => {
  const isEdit = !!budget
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      budget_id: '',
      name: '',
      description: '',
      soft_budget: 0,
      max_budget: 1,
      budget_duration: '1d',
      budget_category: 'platform',
    },
  })

  useEffect(() => {
    if (!visible) return

    reset({
      budget_id: budget?.budget_id ?? '',
      name: budget?.name ?? '',
      description: budget?.description ?? '',
      soft_budget: budget?.soft_budget ?? 0,
      max_budget: budget?.max_budget ?? 1,
      budget_duration: budget?.budget_duration ?? '1d',
      budget_category: budget?.budget_category ?? 'platform',
    })
  }, [budget, reset, visible])

  const handleFormSubmit: SubmitHandler<BudgetFormValues> = async (data) => {
    await onSubmit({
      budget_id: isEdit ? budget?.budget_id : data.budget_id,
      name: data.name,
      description: data.description || null,
      soft_budget: Number(data.soft_budget),
      max_budget: Number(data.max_budget),
      budget_duration: data.budget_duration,
      budget_category: data.budget_category,
    })
    reset()
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={isEdit ? 'Edit Budget' : 'Create Budget'}
      onSubmit={handleSubmit(handleFormSubmit)}
      submitText={isEdit ? 'Save' : 'Create'}
      submitDisabled={isSubmitting || (isEdit && !isDirty)}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Controller
          name="budget_id"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="budget_id"
              label="Budget ID:"
              required
              placeholder="platform-default"
              disabled={isEdit}
              error={errors.budget_id?.message}
            />
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              label="Name:"
              required
              placeholder="Platform default"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="description"
              label="Description:"
              placeholder="What this budget is used for"
              rows={3}
              error={errors.description?.message}
            />
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="budget_category"
            control={control}
            render={({ field }) => (
              <Select
                id="budget_category"
                label="Category:"
                required
                value={field.value}
                options={BUDGET_CATEGORY_OPTIONS}
                onChangeValue={(value) => field.onChange(value)}
                error={errors.budget_category?.message}
              />
            )}
          />

          <Controller
            name="budget_duration"
            control={control}
            render={({ field }) => (
              <Select
                id="budget_duration"
                label="Reset period:"
                required
                value={field.value}
                options={BUDGET_RESET_PERIOD_OPTIONS}
                onChangeValue={(value) => field.onChange(value)}
                error={errors.budget_duration?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Controller
            name="soft_budget"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="soft_budget"
                label="Soft limit:"
                type="number"
                min="0"
                step="0.01"
                error={errors.soft_budget?.message}
              />
            )}
          />

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
        </div>
      </form>
    </Popup>
  )
}

export default BudgetModal
