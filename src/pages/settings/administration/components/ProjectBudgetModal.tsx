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
import { FC, useEffect, useRef } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select/Select'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import {
  BUDGET_CATEGORY_OPTIONS,
  BudgetCategory,
  generateBudgetId,
  generateProjectBudgetName,
} from '@/types/entity/budget'
import {
  ProjectBudget,
  ProjectBudgetCreatePayload,
  ProjectBudgetUpdatePayload,
} from '@/types/entity/projectBudget'

interface ProjectBudgetModalCreateProps {
  budget?: null
  onSubmit: (payload: ProjectBudgetCreatePayload) => Promise<void>
}

interface ProjectBudgetModalEditProps {
  budget: ProjectBudget
  onSubmit: (payload: ProjectBudgetUpdatePayload) => Promise<void>
}

type ProjectBudgetModalProps = {
  visible: boolean
  projectName: string
  preselectedCategory?: BudgetCategory | null
  assignedCategories?: BudgetCategory[]
  onHide: () => void
} & (ProjectBudgetModalCreateProps | ProjectBudgetModalEditProps)

interface ProjectBudgetFormValues {
  name: string
  description: string
  budget_category: BudgetCategory
  budget_duration: string
  soft_budget: number
  max_budget: number
}

const BUDGET_NAME_REGEX = /^[a-zA-Z0-9 ()[\]:-]+$/
const BUDGET_DURATION_REGEX = /^\d+[dhm]$/

const BUDGET_RESET_PERIOD_OPTIONS = [
  { label: 'Daily (1d)', value: '1d' },
  { label: 'Weekly (7d)', value: '7d' },
  { label: 'Monthly (30d)', value: '30d' },
]

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .matches(
      BUDGET_NAME_REGEX,
      'Only letters, numbers, spaces, hyphens, colons, and brackets are allowed'
    )
    .defined(),
  description: Yup.string().default(''),
  budget_category: Yup.mixed<BudgetCategory>()
    .oneOf(BUDGET_CATEGORY_OPTIONS.map((o) => o.value))
    .required('Category is required')
    .defined(),
  budget_duration: Yup.string()
    .required('Reset period is required')
    .matches(BUDGET_DURATION_REGEX, 'Must be a number followed by d, h, or m (e.g. 30d)')
    .defined(),
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
})

const ProjectBudgetModal: FC<ProjectBudgetModalProps> = ({
  visible,
  projectName,
  preselectedCategory,
  assignedCategories = [],
  onHide,
  onSubmit,
  budget,
}) => {
  const isEdit = !!budget
  // Tracks the last auto-generated name so we know if the user has deviated
  const autoNameRef = useRef<string>('')

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProjectBudgetFormValues>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: '',
      description: '',
      budget_category: preselectedCategory ?? 'platform',
      budget_duration: '30d',
      soft_budget: 0,
      max_budget: 1,
    },
  })

  // Reset form when modal opens
  useEffect(() => {
    if (!visible) return

    if (isEdit) {
      autoNameRef.current = ''
      reset({
        name: budget.name,
        description: budget.description ?? '',
        budget_category: budget.budget_category,
        budget_duration: budget.budget_duration,
        soft_budget: budget.soft_budget,
        max_budget: budget.max_budget,
      })
    } else {
      const category = preselectedCategory ?? 'platform'
      const autoName = generateProjectBudgetName(projectName, category)
      autoNameRef.current = autoName
      reset({
        name: autoName,
        description: '',
        budget_category: category,
        budget_duration: '30d',
        soft_budget: 0,
        max_budget: 1,
      })
    }
  }, [visible, preselectedCategory, projectName, budget, isEdit, reset])

  // In create mode: update name when category changes, unless user has edited it
  const categoryValue = watch('budget_category')
  const nameValue = watch('name')

  useEffect(() => {
    if (isEdit || !visible) return
    const autoName = generateProjectBudgetName(projectName, categoryValue)
    if (nameValue === autoNameRef.current) {
      autoNameRef.current = autoName
      setValue('name', autoName, { shouldValidate: false, shouldDirty: false })
    }
  }, [categoryValue, projectName, visible]) // eslint-disable-line react-hooks/exhaustive-deps

  const categoryOptions = BUDGET_CATEGORY_OPTIONS.map((opt) => ({
    ...opt,
    disabled: assignedCategories.includes(opt.value),
  }))

  const handleFormSubmit: SubmitHandler<ProjectBudgetFormValues> = async (data) => {
    if (isEdit) {
      const editOnSubmit = onSubmit as (payload: ProjectBudgetUpdatePayload) => Promise<void>
      await editOnSubmit({
        name: data.name,
        description: data.description || null,
        budget_duration: data.budget_duration,
        soft_budget: Number(data.soft_budget),
        max_budget: Number(data.max_budget),
      })
    } else {
      const createOnSubmit = onSubmit as (payload: ProjectBudgetCreatePayload) => Promise<void>
      await createOnSubmit({
        budget_id: generateBudgetId(data.name),
        name: data.name,
        description: data.description || null,
        project_name: projectName,
        budget_category: data.budget_category,
        budget_duration: data.budget_duration,
        soft_budget: Number(data.soft_budget),
        max_budget: Number(data.max_budget),
      })
    }
    reset()
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={isEdit ? 'Edit Project Budget' : 'Create Project Budget'}
      onSubmit={handleSubmit(handleFormSubmit)}
      submitText={isEdit ? 'Save' : 'Create'}
      submitDisabled={isSubmitting || (isEdit && !isDirty)}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {isEdit && (
          <div>
            <div className="text-xs text-text-quaternary mb-1">Budget ID</div>
            <div className="text-xs text-text-secondary font-mono truncate">{budget.budget_id}</div>
          </div>
        )}

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="name"
              label="Name:"
              required
              placeholder="My Project Platform"
              error={errors.name?.message}
              hint={!isEdit && nameValue ? `ID: ${generateBudgetId(nameValue) || '—'}` : undefined}
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
                options={categoryOptions}
                onChangeValue={(value) => field.onChange(value)}
                error={errors.budget_category?.message}
                disabled
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

export default ProjectBudgetModal
