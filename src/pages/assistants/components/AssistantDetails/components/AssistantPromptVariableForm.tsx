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
import * as Yup from 'yup'

import CheckSvg from '@/assets/icons/check-18.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import ProtectSvg from '@/assets/icons/protect.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'
import TableCell from '@/components/Table/TableCell'
import TooltipButton from '@/components/TooltipButton'
import { ButtonSize, SENSITIVE_VALUE_MASK } from '@/constants'
import VariablePill from '@/pages/assistants/components/AssistantForm/components/SystemPrompt/ManageVariablesPopup/VariablePill'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { ColumnDefinition } from '@/types/table'

interface EditVariableFormRowProps {
  variable: AssistantPromptVariable
  onUpdate: (value: string) => void
  onCancel: () => void
}

const schema = Yup.object().shape({
  value: Yup.string().max(500),
})

const EditVariableFormRow = ({ variable, onUpdate, onCancel }: EditVariableFormRowProps) => {
  const { control, reset, handleSubmit } = useForm({
    mode: 'all',
    resolver: yupResolver(schema),
    defaultValues: {
      value: variable.default_value || '',
    },
  })

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

  const renderVariablePill = () => {
    return (
      <div className="flex gap-2 items-center">
        <VariablePill value={variable.key} userDefined={variable._meta?.userDefined} />
        {variable.description && (
          <TooltipButton content={variable.description} className="mt-0.5" />
        )}
      </div>
    )
  }

  const renderValueInput = () => {
    const isSensitive = variable.is_sensitive
    const isMasked = isSensitive && variable.default_value === SENSITIVE_VALUE_MASK

    return (
      <Controller
        name="value"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex items-center gap-2">
            {isSensitive ? (
              <Input
                type="password"
                placeholder={isMasked ? 'Enter new value to update' : 'Enter value'}
                className="w-[180px] text-xs"
                required
                error={fieldState.error?.message}
                {...field}
              />
            ) : (
              <Textarea
                placeholder="Default value"
                className="resize-vertical h-[60px] w-[180px] text-xs"
                required
                error={fieldState.error?.message}
                {...field}
              />
            )}
            {isSensitive && (
              <ProtectSvg className="w-4 h-4 text-text-quaternary" title="Encrypted credential" />
            )}
          </div>
        )}
      />
    )
  }

  const renderFormActions = () => {
    return (
      <div className="flex w-full justify-end gap-2">
        <Button type="secondary" onClick={handleCancel}>
          <CrossSvg className="w-4 h-4" />
        </Button>

        <Button type="secondary" size={ButtonSize.MEDIUM} onClick={handleFormSubmit}>
          <CheckSvg />
        </Button>
      </div>
    )
  }

  const handleFormSubmit = handleSubmit((values) => onUpdate(values.value!))

  return (
    <tr>
      <TableCell
        key={`${variable.key}-key`}
        value={variable.key}
        definition={getColumnDefinition('key')}
        index={0}
        colIndex={0}
        columnsLength={4}
        customRender={renderVariablePill}
      />

      <TableCell
        key={`${variable.key}-value`}
        value={variable.default_value}
        definition={getColumnDefinition('default_value')}
        index={1}
        colIndex={1}
        columnsLength={4}
        customRender={renderValueInput}
      />

      <TableCell
        key={`${variable.key}-action`}
        value={null}
        definition={getColumnDefinition('action')}
        index={3}
        colIndex={3}
        columnsLength={4}
        customRender={renderFormActions}
      />
    </tr>
  )
}

export default EditVariableFormRow
