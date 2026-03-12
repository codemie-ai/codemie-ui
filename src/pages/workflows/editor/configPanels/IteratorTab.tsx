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
import { useEffect, useMemo, forwardRef, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ConfigurationUpdate } from '@/utils/workflowEditor/actions'

import ConfigAccordion from './components/ConfigAccordion'
import TabFooter from './components/TabFooter'
import ValidationError from './components/ValidationError'

interface IteratorTabProps {
  stateId: string
  config: WorkflowConfiguration
  onConfigChange: (updates: ConfigurationUpdate) => void
  onClose: (skipDirtyCheck?: boolean) => void
  onDelete?: () => void
  validationError?: string
  onClearStateError?: (stateId: string) => void
}

export interface IteratorTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

interface IteratorNodeConfigValues {
  iter_key: string
}

const validationSchema: Yup.ObjectSchema<IteratorNodeConfigValues> = Yup.object().shape({
  iter_key: Yup.string().required('Iteration key is required'),
})

const getDefaultValues = (state?: StateConfiguration): IteratorNodeConfigValues => {
  return {
    iter_key: state?._meta?.data?.next?.iter_key || '',
  }
}

/**
 * Config panel for Iterator nodes
 * Edits the iteration key stored in _meta.data.iter_key
 * This key is propagated to child states when they are dropped into the iterator
 */
const IteratorTab = forwardRef<IteratorTabRef, IteratorTabProps>(
  (
    { stateId, config, onConfigChange, onClose, onDelete, validationError, onClearStateError },
    ref
  ) => {
    const state = useMemo(() => {
      return config.states?.find((s) => s.id === stateId)
    }, [stateId, config.states])

    const {
      control,
      reset,
      trigger,
      getValues,
      formState: { isDirty },
    } = useForm<IteratorNodeConfigValues>({
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
      reset(values)

      onConfigChange({
        state: {
          id: stateId,
          data: {
            next: { iter_key: values.iter_key },
          },
        },
      })

      return true
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => isDirty,
        save: saveData,
      }),
      [isDirty, trigger, getValues, stateId, onConfigChange, reset]
    )

    useEffect(() => {
      if (state) {
        reset(getDefaultValues(state))
      }
    }, [state?.id, reset])

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        onClose?.(true)
      }
    }

    if (!state) return null

    return (
      <>
        <form className="flex flex-col gap-4">
          <ValidationError message={validationError} />

          <div className="text-xs text-text-quaternary mb-2">
            Iterates over a collection, allowing the workflow to perform actions for each item in
            the collection.
          </div>

          <ConfigAccordion title="Node Settings" defaultExpanded={true}>
            <Controller
              name="iter_key"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="Iteration Key"
                  placeholder="Enter key"
                  error={fieldState.error?.message}
                  hint="Variable name to access each item in the loop"
                  required
                />
              )}
            />
          </ConfigAccordion>
        </form>

        <TabFooter onCancel={() => onClose(true)} onSave={handleSave} onDelete={onDelete} />
      </>
    )
  }
)

IteratorTab.displayName = 'IteratorTab'

export default IteratorTab
