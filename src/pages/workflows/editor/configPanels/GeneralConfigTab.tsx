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
import React, { forwardRef, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'

import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import GuardrailAssignmentPanel from '@/components/guardrails/GuardrailAssignmentPanel/GuardrailAssignmentPanel'
import ProjectSelector from '@/components/ProjectSelector'
import { baseWorkflowSchema, WorkflowFormValues } from '@/pages/workflows/components/workflowSchema'
import { GuardrailEntity } from '@/types/entity/guardrail'

import TabFooter from './components/TabFooter'

interface GeneralConfigTabProps {
  defaultValues?: Partial<WorkflowFormValues>
  onChange?: (values: WorkflowFormValues) => void
  onUpdate?: (values: WorkflowFormValues) => void
  onClose: (skipDirtyCheck?: boolean) => void
}

const GeneralConfigTab = forwardRef(
  ({ defaultValues = {}, onChange, onUpdate, onClose }: GeneralConfigTabProps, ref) => {
    const { control, formState, trigger, getValues, watch, reset } = useForm<WorkflowFormValues>({
      resolver: yupResolver(baseWorkflowSchema) as any,
      mode: 'onChange',
      defaultValues: {
        name: defaultValues.name ?? '',
        project: defaultValues.project ?? '',
        description: defaultValues.description ?? '',
        icon_url: defaultValues.icon_url ?? '',
        shared: defaultValues.shared ?? false,
        guardrail_assignments: defaultValues.guardrail_assignments ?? [],
      },
    })

    const values = watch()

    React.useEffect(() => {
      onChange?.(values)
    }, [values, onChange])

    const saveData = async (): Promise<boolean> => {
      const isValid = await trigger()
      if (isValid) {
        const values = getValues()
        reset(values)
        onUpdate?.(values)
        return true
      }
      return false
    }

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        validate: async () => {
          return trigger()
        },
        getValues: () => getValues(),
        isDirty: () => formState.isDirty,
        save: saveData,
      }),
      [formState.isDirty, formState.dirtyFields, trigger, getValues, reset, onUpdate, defaultValues]
    )

    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <ProjectSelector label="Project name:" className="grow max-w-full" {...field} />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="shared"
              control={control}
              render={({ field }) => (
                <Switch
                  id="shared"
                  label="Shared with Project Team"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  id="name"
                  label="Name:"
                  placeholder="Name*"
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  id="description"
                  placeholder="Description"
                  label="Description"
                  rows={4}
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="icon_url"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  id="icon_url"
                  placeholder="Icon URL"
                  label="Icon URL"
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
          </div>

          {values.project && (
            <GuardrailAssignmentPanel
              isEmbedded
              project={values.project}
              entityType={GuardrailEntity.WORKFLOW}
              control={control}
              formState={formState}
              trigger={trigger}
              getValues={getValues}
            />
          )}
        </div>

        <TabFooter onCancel={() => onClose(true)} onSave={handleSave} />
      </>
    )
  }
)

GeneralConfigTab.displayName = 'GeneralConfigTab'

export default GeneralConfigTab
