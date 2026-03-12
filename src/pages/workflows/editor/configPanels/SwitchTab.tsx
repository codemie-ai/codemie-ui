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
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import * as Yup from 'yup'

import DeleteSVG from '@/assets/icons/delete.svg?react'
import InfoSVG from '@/assets/icons/info.svg?react'
import PlusSVG from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import {
  SwitchStateConfiguration,
  StateSwitch,
  WorkflowConfiguration,
} from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor/actions'
import { getStateNext } from '@/utils/workflowEditor/helpers/states'

import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'
import { useConditionalTabForm, ConfigTabRef } from './hooks/useConditionalTabForm'

interface SwitchTabProps {
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface SwitchTabRef extends ConfigTabRef {}

interface SwitchCase {
  condition: string
}

interface SwitchNodeConfigValues {
  cases: SwitchCase[]
}

const validationSchema: Yup.ObjectSchema<SwitchNodeConfigValues> = Yup.object().shape({
  cases: Yup.array()
    .of(
      Yup.object().shape({
        condition: Yup.string().required('Condition is required'),
      })
    )
    .required(),
})

const getDefaultValues = (state?: SwitchStateConfiguration): SwitchNodeConfigValues => {
  const next = state ? getStateNext(state) : undefined
  return {
    cases: next?.switch?.cases?.map((c) => ({ condition: c.condition })) || [{ condition: '' }],
  }
}

/**
 * Config panel for Switch nodes
 * Edits the switch branching logic (next.switch):
 * - cases: array of conditions (state_ids determined by connections)
 * - default: state_id determined by connection
 *
 * This modifies the source state's next.switch field
 */
const SwitchTab = forwardRef<SwitchTabRef, SwitchTabProps>(
  (
    { stateId, config, onConfigChange, onClose, onDelete, validationError, onClearStateError },
    ref
  ) => {
    const state = useMemo(() => {
      return config.states?.find((s) => s.id === stateId) as SwitchStateConfiguration
    }, [stateId, config.states])

    const {
      control,
      reset,
      trigger,
      getValues,
      formState: { isDirty },
    } = useForm<SwitchNodeConfigValues>({
      resolver: yupResolver(validationSchema),
      mode: 'onChange',
      defaultValues: getDefaultValues(state),
    })

    const { fields, append, remove } = useFieldArray({
      control,
      name: 'cases',
    })

    const saveData = async (): Promise<boolean> => {
      if (validationError && onClearStateError) {
        onClearStateError(stateId)
      }

      const isValid = await trigger()
      if (!isValid) return false

      const values = getValues()
      const stateNext = getStateNext(state)
      const existingSwitch = stateNext?.switch

      const switchConfig: StateSwitch = {
        cases: values.cases.map((caseItem, index) => ({
          condition: caseItem.condition,
          state_id: existingSwitch?.cases[index]?.state_id || '',
        })),
        default: existingSwitch?.default || '',
      }

      reset(values)

      onConfigChange({
        state: {
          id: stateId,
          data: { next: { ...stateNext, switch: switchConfig } },
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

          <div className="text-xs text-text-quaternary">
            Allows for multiple branching paths based on different conditions, similar to a
            switch-case statement in programming.
          </div>

          {!!fields.length && (
            <div className="flex flex-col gap-3 mt-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Controller
                      name={`cases.${index}.condition`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Input
                          {...field}
                          label={`Case ${index + 1}`}
                          placeholder={`e.g., status == "success"`}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                  <Button type="delete" onClick={() => remove(index)} className="mt-6 opacity-85">
                    <DeleteSVG className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="secondary" onClick={() => append({ condition: '' })} className="self-start">
            <PlusSVG className="w-4 h-4" />
            Add
          </Button>

          <div className="flex gap-2 items-start text-xs text-text-quaternary">
            <InfoSVG className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">NOTE:</span> Cases are evaluated as Python-like boolean
              expressions using fields from output_schema
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

SwitchTab.displayName = 'SwitchTab'

export default SwitchTab
