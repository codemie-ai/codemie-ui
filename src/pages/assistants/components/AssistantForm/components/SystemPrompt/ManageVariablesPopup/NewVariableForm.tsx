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
import React from 'react'
import { Controller, useForm } from 'react-hook-form'

import ProtectSvg from '@/assets/icons/protect.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import { ButtonSize } from '@/constants'
import { AssistantPromptVariable } from '@/types/entity/assistant'

import { getSchema } from './util'

interface AddVariableFormProps {
  existingVariables: AssistantPromptVariable[]
  onSubmit: (variable: AssistantPromptVariable) => void
  onCancel: () => void
}

const AddVariableForm: React.FC<AddVariableFormProps> = ({
  existingVariables,
  onSubmit,
  onCancel,
}) => {
  const schema = getSchema(existingVariables)

  const { control, reset, handleSubmit, watch } = useForm({
    mode: 'all',
    resolver: yupResolver(schema),
    defaultValues: {
      key: '',
      description: '',
      default_value: '',
      is_sensitive: false,
    },
  })

  const isSensitive = watch('is_sensitive')

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    reset()
    onCancel()
  }

  const handleFormSubmit = handleSubmit(onSubmit)

  return (
    <form
      className="flex flex-col mt-4 gap-4 mb-6 p-4 bg-surface-base-tertiary rounded-lg"
      onSubmit={handleFormSubmit}
      autoComplete="off"
    >
      <h3 className="text-md font-medium">Add Variable</h3>
      <div className="grid grid-cols-[1fr,2fr,2fr] gap-4">
        <Controller
          name="key"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              label="Key:"
              placeholder="e.g., project_name"
              required
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />

        <Controller
          name="default_value"
          control={control}
          render={({ field, fieldState }) =>
            isSensitive ? (
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    type="password"
                    label="Default Value"
                    placeholder="Enter sensitive value"
                    error={fieldState.error?.message}
                    {...field}
                  />
                </div>
                <ProtectSvg
                  className="w-4 h-4 text-text-quaternary mt-8"
                  title="Encrypted credential"
                />
              </div>
            ) : (
              <Textarea
                label="Default Value"
                placeholder="Default value"
                className="resize-vertical h-[80px]"
                error={fieldState.error?.message}
                {...field}
              />
            )
          }
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Textarea
              label="Description"
              placeholder="What does this variable represent?"
              className="resize-vertical h-[80px]"
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
      </div>

      <div className="flex items-start">
        <Controller
          name="is_sensitive"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={(checked) => field.onChange(checked)}
              label="Sensitive Variable (Contains secrets like API keys or passwords)"
              hint="Enable encryption for this variable. Values will be encrypted at rest and masked in the UI."
            />
          )}
        />
      </div>

      <div className="flex w-full justify-end gap-2">
        <Button type="secondary" onClick={handleCancel}>
          Cancel
        </Button>

        <Button type="primary" size={ButtonSize.MEDIUM} onClick={handleFormSubmit}>
          Add
        </Button>
      </div>
    </form>
  )
}

export default AddVariableForm
