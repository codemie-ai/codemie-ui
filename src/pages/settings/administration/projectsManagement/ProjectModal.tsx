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
import { FC, useEffect, useState } from 'react'
import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { costCentersStore } from '@/store/costCenters'
import { userStore } from '@/store/user'
import { Project } from '@/types/entity/project'
import { ProjectDetail } from '@/types/entity/projectManagement'
import { FilterOption } from '@/types/filters'

interface ProjectModalProps {
  visible: boolean
  project?: Project | ProjectDetail | null
  onHide: () => void
  onSubmit: (data: ProjectFormData) => Promise<void>
}

export interface ProjectFormData {
  name?: string
  description?: string
  cost_center_id?: string | null
  clear_cost_center?: boolean
  project_member_budget_tracking_enabled?: boolean
}

interface ProjectModalFormValues {
  name: string
  description: string
  cost_center_id: string
  project_member_budget_tracking_enabled: boolean
}

const PROJECT_NAME_REGEX = /^[a-z0-9][a-z0-9_-]*$/

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Name is required')
    .matches(PROJECT_NAME_REGEX, "Use lowercase letters, numbers, '-' and '_' only")
    .defined(),
  description: Yup.string().required('Description is required'),
  cost_center_id: Yup.string().default(''),
})

const FEATURE_FLAG_COST_CENTERS = 'features:costCenters'

const ProjectModal: FC<ProjectModalProps> = ({ visible, project, onHide, onSubmit }) => {
  const { user } = useSnapshot(userStore)
  const isNameDisabled = (project?.user_count ?? 0) > 0
  const isAdmin = user?.isAdmin ?? false
  const isMaintainer = user?.isMaintainer ?? false
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAG_COST_CENTERS)
  const [costCenterOptions, setCostCenterOptions] = useState<FilterOption[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectModalFormValues>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      cost_center_id: '',
      project_member_budget_tracking_enabled: false,
    },
  })

  useEffect(() => {
    if (visible && project) {
      reset({
        name: project.name,
        description: project.description || '',
        cost_center_id: project.cost_center_id || '',
        project_member_budget_tracking_enabled: !!project.project_member_budget_tracking_enabled,
      })
    } else if (visible && !project) {
      reset({
        name: '',
        description: '',
        cost_center_id: '',
        project_member_budget_tracking_enabled: false,
      })
    }

    if (visible && isAdmin && isCostCentersEnabled) {
      costCentersStore
        .getCostCenterOptions()
        .then(setCostCenterOptions)
        .catch(() => setCostCenterOptions([]))
    }
  }, [visible, project, reset, isAdmin, isCostCentersEnabled])

  const handleCostCenterSearch = (query: string) => {
    if (!isAdmin || !isCostCentersEnabled) return
    costCentersStore
      .getCostCenterOptions(query)
      .then(setCostCenterOptions)
      .catch(() => setCostCenterOptions([]))
  }

  const handleFormSubmit: SubmitHandler<ProjectModalFormValues> = async (data) => {
    await onSubmit({
      name: isNameDisabled ? undefined : data.name,
      description: data.description,
      cost_center_id: data.cost_center_id || null,
      clear_cost_center: !!project && !data.cost_center_id,
      project_member_budget_tracking_enabled: project
        ? data.project_member_budget_tracking_enabled
        : undefined,
    })
    reset()
  }

  const isEdit = !!project
  const isSubmitDisabled = isSubmitting || (isEdit && !isDirty)

  const header = isEdit ? 'Edit Project' : 'Create Project'

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header={header}
      onSubmit={handleSubmit(handleFormSubmit)}
      submitText={isEdit ? 'Save' : 'Create'}
      submitDisabled={isSubmitDisabled}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <span
              data-tooltip-id="react-tooltip"
              data-tooltip-place="bottom"
              data-tooltip-content={
                isNameDisabled
                  ? 'Project name cannot be changed while users are assigned'
                  : undefined
              }
            >
              <Input
                {...field}
                id="name"
                label="Name:"
                required
                placeholder="Project Name"
                error={errors.name?.message}
                disabled={isNameDisabled}
              />
            </span>
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
              required
              placeholder="Describe what this project is for"
              rows={4}
              error={errors.description?.message}
            />
          )}
        />

        {isAdmin && isCostCentersEnabled && (
          <Controller
            name="cost_center_id"
            control={control}
            render={({ field }) => (
              <Autocomplete
                id="cost_center_id"
                label="Cost center:"
                value={field.value || ''}
                onChange={field.onChange}
                options={costCenterOptions}
                placeholder="Search cost center"
                allowEmpty
                localFilter={false}
                onSearch={handleCostCenterSearch}
              />
            )}
          />
        )}

        {isEdit && isMaintainer && (
          <Controller
            name="project_member_budget_tracking_enabled"
            control={control}
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <Switch
                id="project_member_budget_tracking_enabled"
                label="Project member budget tracking"
                hint="When enabled, budget enforcement tracks individual project members under the project budget."
                value={value}
                onBlur={onBlur}
                ref={ref}
                onChange={(event) => onChange((event.target as HTMLInputElement).checked)}
              />
            )}
          />
        )}
      </form>
    </Popup>
  )
}

export default ProjectModal
