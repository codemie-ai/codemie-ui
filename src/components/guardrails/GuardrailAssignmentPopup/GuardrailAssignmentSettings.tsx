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

import { FC } from 'react'

import { GuardrailEntity, GuardrailMode, GuardrailSource } from '@/types/entity/guardrail'
import { cn } from '@/utils/utils'

import { useGuardrailAssignmentFormContext } from './hooks/useGuardrailAssignmentFormContext'
import { GuardrailAssignmentFormValues } from './schemas/guardrailAssignmentSchema'
import {
  getItemFieldPath,
  getItemsPath,
  GUARDRAIL_ENTITY_FORM_KEYS,
} from './utils/guardrailAssignmentUtils'
import GuardrailAssignmentModeSelector from '../selectors/GuardrailAssignmentModeSelector'
import GuardrailAssignmentSourceSelector from '../selectors/GuardrailAssignmentSourceSelector'

export interface GuardrailAssignmentSettingsProps {
  entity: GuardrailEntity
  itemIndex?: number
  disabled?: boolean
  className?: string
}

export const GuardrailAssignmentSettings: FC<GuardrailAssignmentSettingsProps> = ({
  entity,
  itemIndex,
  className,
  disabled = false,
}) => {
  const { formState, watch, setValue, trigger, validateDuplicates } =
    useGuardrailAssignmentFormContext()

  const getFieldError = (field: 'source' | 'mode'): string | undefined => {
    const baseKey = GUARDRAIL_ENTITY_FORM_KEYS[entity]
    const hasIndices = itemIndex !== undefined

    if (hasIndices) {
      const formKey = baseKey as keyof Omit<GuardrailAssignmentFormValues, 'project'>
      return formState.errors?.[formKey]?.items?.[itemIndex]?.settings?.[field]?.message
    }

    return formState.errors?.[baseKey]?.settings?.[0]?.[field]?.message
  }

  const handleFieldChange = (field: 'source' | 'mode', value: GuardrailSource | GuardrailMode) => {
    const fieldPath = getItemFieldPath(entity, itemIndex, field)
    setValue(fieldPath, value)

    if (entity !== GuardrailEntity.PROJECT) validateDuplicates(getItemsPath(entity))
    trigger(fieldPath)
  }

  const sourceError = !disabled ? getFieldError('source') : undefined
  const modeError = !disabled ? getFieldError('mode') : undefined

  const sourceFieldPath = getItemFieldPath(entity, itemIndex, 'source')
  const modeFieldPath = getItemFieldPath(entity, itemIndex, 'mode')

  const sourceValue = watch(sourceFieldPath) as GuardrailSource
  const modeValue = watch(modeFieldPath) as GuardrailMode

  return (
    <div className={cn('flex gap-2', className)}>
      <GuardrailAssignmentSourceSelector
        value={sourceValue}
        onChange={(value) => handleFieldChange('source', value)}
        disabled={disabled}
        error={sourceError}
      />

      <GuardrailAssignmentModeSelector
        value={modeValue}
        onChange={(value) => handleFieldChange('mode', value)}
        disabled={disabled}
        error={modeError}
      />
    </div>
  )
}
