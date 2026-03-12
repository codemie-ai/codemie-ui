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

import {
  EntityAssignmentItem,
  EntityAssignmentItemRequest,
  GuardrailEntity,
  GuardrailMode,
  GuardrailSettings,
  GuardrailSource,
} from '@/types/entity/guardrail'

import {
  EntityAssignmentFormItem,
  GuardrailAssignmentFormValues,
} from '../schemas/guardrailAssignmentSchema'

export const isValidGuardrailAssignmentSettings = (setting: {
  mode: string
  source: string
}): setting is GuardrailSettings => {
  return (
    setting.mode !== '' &&
    setting.source !== '' &&
    Object.values(GuardrailMode).includes(setting.mode as GuardrailMode) &&
    Object.values(GuardrailSource).includes(setting.source as GuardrailSource)
  )
}

export const flattenGuardrailAssignmentItems = (
  items: EntityAssignmentItem[] = []
): EntityAssignmentFormItem[] => {
  const flattenedItems: EntityAssignmentFormItem[] = []

  items.forEach((item) => {
    item.settings.forEach((itemSetting) => {
      flattenedItems.push({
        id: item.id,
        name: item.name,
        icon_url: item.icon_url,
        index_type: item.index_type,
        settings: itemSetting,
      })
    })
  })

  return flattenedItems
}

export const unflattenGuardrailAssignmentItems = (
  flattenedItems: EntityAssignmentFormItem[] = []
): EntityAssignmentItemRequest[] => {
  const itemsMap = new Map<string, EntityAssignmentFormItem['settings'][]>()

  flattenedItems.forEach((item) => {
    if (!itemsMap.has(item.id ?? '')) {
      itemsMap.set(item.id ?? '', [])
    }
    itemsMap.get(item.id ?? '')!.push(item.settings)
  })

  return Array.from(itemsMap.entries()).map(([id, settings]) => ({
    id,
    settings: settings.filter(isValidGuardrailAssignmentSettings),
  }))
}

// Paths

export const GUARDRAIL_ENTITY_FORM_KEYS = {
  [GuardrailEntity.ASSISTANT]: 'assistants',
  [GuardrailEntity.WORKFLOW]: 'workflows',
  [GuardrailEntity.KNOWLEDGEBASE]: 'datasources',
  [GuardrailEntity.PROJECT]: 'project',
} as const satisfies Record<GuardrailEntity, keyof GuardrailAssignmentFormValues>

export const getSettingsPath = (entity: GuardrailEntity) => {
  return `${GUARDRAIL_ENTITY_FORM_KEYS[entity]}.settings` as const
}

export const getItemsPath = (entity: Exclude<GuardrailEntity, GuardrailEntity.PROJECT>) => {
  const baseKey = GUARDRAIL_ENTITY_FORM_KEYS[entity] as keyof Omit<
    GuardrailAssignmentFormValues,
    'project'
  >
  return `${baseKey}.items` as const
}

export const getItemFieldPath = (
  entity: GuardrailEntity,
  itemIndex: number | undefined,
  field: 'source' | 'mode'
) => {
  const baseKey = GUARDRAIL_ENTITY_FORM_KEYS[entity]
  const hasIndices = itemIndex !== undefined

  return hasIndices
    ? (`${
        baseKey as keyof Omit<GuardrailAssignmentFormValues, 'project'>
      }.items.${itemIndex}.settings.${field}` as const)
    : (`${baseKey}.settings.0.${field}` as const)
}
