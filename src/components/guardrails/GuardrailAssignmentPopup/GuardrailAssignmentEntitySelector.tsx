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
import { UseFieldArrayUpdate } from 'react-hook-form'

import { AssistantSelector } from '@/pages/assistants/components'
import ContextSelector from '@/pages/assistants/components/AssistantForm/components/ContextSelector'
import WorkflowSelector, {
  WorkflowSelectorProps,
} from '@/pages/workflows/components/WorkflowSelector'
import { GuardrailEntity } from '@/types/entity/guardrail'

import { useGuardrailAssignmentFormContext } from './hooks/useGuardrailAssignmentFormContext'
import { GuardrailAssignmentOptions } from './hooks/useGuardrailAssignmentOptions'
import {
  EntityAssignmentFormItem,
  GuardrailAssignmentFormValues,
} from './schemas/guardrailAssignmentSchema'
import { getItemsPath } from './utils/guardrailAssignmentUtils'

interface GuardrailAssignmentEntitySelectorProps {
  entity: Exclude<GuardrailEntity, GuardrailEntity.PROJECT>
  isEntityLevelEnabled: boolean
  initialOptions: GuardrailAssignmentOptions
  project: string

  itemIndex: number
  item: {
    id?: string
    name?: string
    icon_url?: string | null
    index_type?: string | undefined
    settings: {
      mode: string
      source: string
    }
  }
  updateItem: UseFieldArrayUpdate<GuardrailAssignmentFormValues, any>
}

const GuardrailAssignmentEntitySelector: FC<GuardrailAssignmentEntitySelectorProps> = ({
  entity,
  initialOptions,
  isEntityLevelEnabled,
  project,

  item,
  itemIndex,
  updateItem,
}) => {
  const { validateDuplicates, trigger, isProjectLevelEnabled, formState } =
    useGuardrailAssignmentFormContext()

  const itemsPath = getItemsPath(entity)
  const normalizeValue = <T,>(value: T | undefined): T[] => (value ? [value] : [])

  const getFieldError = (): string | undefined => {
    const formKey = itemsPath.split('.')[0]
    const itemErrors = formState.errors?.[formKey]?.items?.[itemIndex]
    return itemErrors?.id?.message
  }

  const fieldError = getFieldError()
  const shouldShowError = !isProjectLevelEnabled && !isEntityLevelEnabled && fieldError

  const handleChange = (
    value: {
      id?: string
      name?: string
      iconUrl?: string
      context_type?: string
    }[]
  ) => {
    const newValue = value.at(-1) ?? {}

    if (newValue.id && newValue.id !== item.id) {
      const updatedItem: EntityAssignmentFormItem = {
        id: newValue.id,
        name: newValue.name,
        icon_url: newValue.iconUrl ?? null,
        settings: item.settings as EntityAssignmentFormItem['settings'],
      }

      if (entity === GuardrailEntity.KNOWLEDGEBASE) {
        updatedItem.index_type = newValue.context_type
      }

      updateItem(itemIndex, updatedItem)
      validateDuplicates(itemsPath)
      trigger(`${itemsPath}.${itemIndex}.id`)
    }
  }

  const sharedBaseProps = {
    singleValue: true,
    disabled: isProjectLevelEnabled || isEntityLevelEnabled,
    project,

    className: 'grow min-w-0',
    selectClassName: 'max-h-[32px] min-h-[32px] max-w-full',
    errorClassName: 'text-xs mt-1',

    onChange: handleChange,
    error: shouldShowError ? fieldError : undefined,
  } satisfies WorkflowSelectorProps

  if (entity === GuardrailEntity.ASSISTANT) {
    const selectedValue =
      item.id && item.name
        ? { id: item.id, name: item.name, iconUrl: item.icon_url ?? '' }
        : undefined

    return (
      <AssistantSelector
        hideHeader
        initialOptions={initialOptions[entity]}
        placeholder="Select Assistant"
        value={normalizeValue(selectedValue)}
        {...sharedBaseProps}
      />
    )
  }

  if (entity === GuardrailEntity.KNOWLEDGEBASE) {
    const selectedValue =
      item.id && item.name && item.index_type
        ? { id: item.id, name: item.name, context_type: item.index_type }
        : undefined

    return (
      <ContextSelector
        withID
        hideHeader
        hideAddButton
        paginated
        initialOptions={initialOptions[entity]}
        placeholder="Select Data Source"
        value={normalizeValue(selectedValue)}
        {...sharedBaseProps}
      />
    )
  }

  if (entity === GuardrailEntity.WORKFLOW) {
    const selectedValue =
      item.id && item.name
        ? { id: item.id, name: item.name, iconUrl: item.icon_url ?? '' }
        : undefined

    return (
      <WorkflowSelector
        initialOptions={initialOptions[entity]}
        placeholder="Select Workflow"
        value={normalizeValue(selectedValue)}
        {...sharedBaseProps}
      />
    )
  }

  return null
}

export default GuardrailAssignmentEntitySelector
