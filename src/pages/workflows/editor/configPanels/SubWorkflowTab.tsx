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
import { useRef, forwardRef, useImperativeHandle } from 'react'
import { Controller, useForm } from 'react-hook-form'

import WorkflowSelector from '@/pages/workflows/components/WorkflowSelector'
import { workflowsStore } from '@/store/workflows'
import { NodeTypes } from '@/types/workflowEditor/base'
import {
  SubWorkflowStateConfiguration,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor'

import CommonStateFields, { CommonStateFieldsRef } from './CommonStateFields'
import ConfigAccordion from './components/ConfigAccordion'
import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import { subWorkflowFormSchema, SubWorkflowFormValues } from './subWorkflowFormSchema'
import { buildCommonStateConfig } from './utils/formUtils'
import { registerFields } from '../utils/visualEditorFieldRegistry'

registerFields(['workflow_id'], NodeTypes.SUB_WORKFLOW, 'resource_validation')

interface SubWorkflowTabProps {
  project: string
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete: () => void
  onDuplicate?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface SubWorkflowTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

const SubWorkflowTab = forwardRef<SubWorkflowTabRef, SubWorkflowTabProps>(
  (
    {
      project,
      stateId,
      config,
      onConfigChange,
      onClose,
      onDelete,
      onDuplicate,
      validationError,
      onClearStateError,
    },
    ref
  ) => {
    const state = config.states?.find((s) => s.id === stateId) as SubWorkflowStateConfiguration

    const {
      control,
      getValues,
      trigger,
      formState: { isDirty: isFormDirty },
      reset,
    } = useForm<SubWorkflowFormValues>({
      resolver: yupResolver(subWorkflowFormSchema as any),
      mode: 'onChange',
      defaultValues: {
        workflow_id: state?.workflow_id ?? null,
      },
    })

    const commonStateFieldsRef = useRef<CommonStateFieldsRef>(null)

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      if (!commonStateFieldsRef.current) return false
      const isCommonFieldsValid = await commonStateFieldsRef.current.validate()
      if (!isCommonFieldsValid) return false

      const isFormValid = await trigger()
      if (!isFormValid) return false

      const commonValues = commonStateFieldsRef.current.getValues()
      const formValues = getValues()

      const updatedStateConfig: SubWorkflowStateConfiguration = {
        ...buildCommonStateConfig(commonValues, state),
        workflow_id: formValues.workflow_id ?? '',
      }

      commonStateFieldsRef.current?.reset()
      reset(formValues)

      onConfigChange({
        state: { id: stateId, data: updatedStateConfig },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const commonFieldsDirty = commonStateFieldsRef.current?.isDirty() ?? false
          return commonFieldsDirty || isFormDirty
        },
        save: saveData,
      }),
      [isFormDirty, state, stateId, config, onConfigChange, validationError, onClearStateError]
    )

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    if (!state) return null

    return (
      <>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <ConfigAccordion title="Sub-Workflow Configuration" defaultExpanded={true}>
            <Controller
              name="workflow_id"
              control={control}
              render={({ field, fieldState }) => (
                <WorkflowSelector
                  label="Sub-Workflow"
                  singleValue={true}
                  value={field.value ? [{ id: field.value, name: field.value }] : []}
                  onChange={(opts) => field.onChange(opts[0]?.id ?? null)}
                  getOptions={workflowsStore.getSelectableWorkflows}
                  project={project}
                  error={fieldState.error?.message}
                />
              )}
            />
          </ConfigAccordion>

          <CommonStateFields ref={commonStateFieldsRef} state={state} />
        </form>

        <TabFooter
          onCancel={() => onClose(true)}
          onSave={handleSave}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      </>
    )
  }
)

SubWorkflowTab.displayName = 'SubWorkflowTab'

export default SubWorkflowTab
