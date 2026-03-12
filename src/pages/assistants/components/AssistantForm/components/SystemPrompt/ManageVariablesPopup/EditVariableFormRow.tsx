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

import CheckSvg from '@/assets/icons/check-18.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import ProtectSvg from '@/assets/icons/protect.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import TableCell from '@/components/Table/TableCell'
import { ButtonSize } from '@/constants'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { ColumnDefinition } from '@/types/table'

import { getSchema } from './util'
import VariablePill from './VariablePill'

interface EditVariableFormRowProps {
  variable: AssistantPromptVariable
  existingVariables: AssistantPromptVariable[]
  onSubmit: (variable: AssistantPromptVariable) => void
  onCancel: () => void
}

const EditVariableFormRow = ({
  variable,
  existingVariables,
  onSubmit,
  onCancel,
}: EditVariableFormRowProps) => {
  const schema = getSchema(existingVariables.filter((item) => item.key !== variable.key))

  const { control, reset, handleSubmit, watch } = useForm({
    mode: 'all',
    resolver: yupResolver(schema),
    defaultValues: {
      key: variable.key,
      description: variable.description || '',
      default_value: variable.default_value,
      is_sensitive: variable.is_sensitive || false,
    },
  })

  const isSensitive = watch('is_sensitive')

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    reset()
    onCancel()
  }

  const getColumnDefinition = (field: string): ColumnDefinition => {
    return {
      label: field,
      key: field,
      type: 'custom',
    }
  }

  const renderName = (item) => {
    return <VariablePill value={item} />
  }

  const renderValueInput = () => {
    return (
      <Controller
        name="default_value"
        control={control}
        render={({ field, fieldState }) =>
          isSensitive ? (
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="Enter sensitive value"
                className="w-full"
                error={fieldState.error?.message}
                {...field}
              />
              <ProtectSvg
                className="w-4 h-4 text-text-quaternary flex-shrink-0"
                title="Encrypted credential"
              />
            </div>
          ) : (
            <Textarea
              placeholder="Default value"
              className="resize-vertical h-[80px]"
              error={fieldState.error?.message}
              {...field}
            />
          )
        }
      />
    )
  }

  const renderDescriptionInput = () => {
    return (
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Textarea
            placeholder="What does this variable represent?"
            className="resize-vertical h-[80px]"
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />
    )
  }

  const renderSensitiveCheckbox = () => {
    return (
      <Controller
        name="is_sensitive"
        control={control}
        render={({ field }) => (
          <div className="flex items-center justify-start">
            <Checkbox
              checked={field.value}
              onChange={(checked) => field.onChange(checked)}
              label=""
            />
          </div>
        )}
      />
    )
  }

  const renderActions = () => {
    return (
      <div className="flex w-full justify-end gap-2">
        <Button type="secondary" onClick={handleCancel}>
          <CrossSvg />
        </Button>

        <Button type="secondary" size={ButtonSize.MEDIUM} onClick={handleFormSubmit}>
          <CheckSvg />
        </Button>
      </div>
    )
  }

  const handleFormSubmit = handleSubmit(onSubmit)

  return (
    <tr>
      <TableCell
        key={'key'}
        value={variable.key}
        definition={getColumnDefinition('key')}
        index={0}
        colIndex={0}
        columnsLength={5}
        customRender={renderName}
      />

      <TableCell
        key={'default_value'}
        value={variable.default_value}
        definition={getColumnDefinition('default_value')}
        index={1}
        colIndex={1}
        columnsLength={5}
        customRender={renderValueInput}
      />

      <TableCell
        key={'description'}
        value={variable.description}
        definition={getColumnDefinition('description')}
        index={2}
        colIndex={2}
        columnsLength={5}
        customRender={renderDescriptionInput}
      />

      <TableCell
        key={'is_sensitive'}
        value={variable.is_sensitive}
        definition={getColumnDefinition('is_sensitive')}
        index={3}
        colIndex={3}
        columnsLength={5}
        customRender={renderSensitiveCheckbox}
      />

      <TableCell
        key={'action'}
        value={null}
        definition={getColumnDefinition('action')}
        index={4}
        colIndex={4}
        columnsLength={5}
        customRender={renderActions}
      />
    </tr>
  )
}

export default EditVariableFormRow
