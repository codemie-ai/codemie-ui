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
import { useMemo, forwardRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import InfoSVG from '@/assets/icons/info.svg?react'
import Input from '@/components/form/Input'
import {
  ConditionalStateConfiguration,
  StateCondition,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor/actions'
import { getStateNext } from '@/utils/workflowEditor/helpers/states'

import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import { useConditionalTabForm, ConfigTabRef } from './hooks/useConditionalTabForm'

interface ConditionalTabProps {
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface ConditionalTabRef extends ConfigTabRef {}

interface ConditionalNodeConfigValues {
  expression: string
}

const validationSchema: Yup.ObjectSchema<ConditionalNodeConfigValues> = Yup.object().shape({
  expression: Yup.string().required('Expression is required').min(1, 'Expression cannot be empty'),
})

const getDefaultValues = (state?: ConditionalStateConfiguration): ConditionalNodeConfigValues => {
  if (!state) {
    return { expression: '' }
  }
  const next = getStateNext(state)
  return {
    expression: next?.condition?.expression || '',
  }
}

const ConditionalTab = forwardRef<ConditionalTabRef, ConditionalTabProps>(
  (
    { stateId, config, onConfigChange, onClose, onDelete, validationError, onClearStateError },
    ref
  ) => {
    const state = useMemo(() => {
      return config.states?.find((s) => s.id === stateId) as ConditionalStateConfiguration
    }, [stateId, config.states])

    const {
      control,
      reset,
      trigger,
      getValues,
      formState: { isDirty },
    } = useForm<ConditionalNodeConfigValues>({
      resolver: yupResolver(validationSchema),
      mode: 'onChange',
      defaultValues: getDefaultValues(state),
    })

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      const isValid = await trigger()
      if (!isValid) return false

      const values = getValues()
      const stateNext = getStateNext(state)
      const condition: StateCondition = {
        expression: values.expression,
        then: stateNext?.condition?.then || '', // nosonar
        otherwise: stateNext?.condition?.otherwise || '',
      }

      reset(values)

      onConfigChange({
        state: {
          id: stateId,
          data: { next: { ...stateNext, condition } },
        },
      })

      return true
    }

    const { handleSave } = useConditionalTabForm({
      ref,
      isDirty,
      saveData,
      state,
      getDefaultValues,
      reset,
    })

    if (!state) return null

    return (
      <>
        <form className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <div className="text-xs text-text-quaternary mb-2">
            Decides the next state based on a condition evaluated at runtime.
          </div>

          <Controller
            name="expression"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                {...field}
                label="Expression"
                placeholder='e.g., result.status == "success"'
                error={fieldState.error?.message}
              />
            )}
          />

          <div className="flex gap-2 items-start text-xs text-text-quaternary">
            <InfoSVG className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">NOTE:</span> Expression is evaluated as a Python-like
              boolean expression using fields from output_schema
            </div>
          </div>
        </form>

        <TabFooter
          onCancel={() => onClose(true)}
          onSave={() => handleSave(onClose)}
          onDelete={onDelete}
        />
      </>
    )
  }
)

ConditionalTab.displayName = 'ConditionalTab'

export default ConditionalTab
