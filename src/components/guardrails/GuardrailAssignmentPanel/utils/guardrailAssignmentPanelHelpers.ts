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

import { GuardrailAssignment, GuardrailEntity } from '@/types/entity/guardrail'

const getEntityHumanizedName = (entity: GuardrailEntity): string => {
  const entityNames: Record<Exclude<GuardrailEntity, GuardrailEntity.PROJECT>, string> = {
    [GuardrailEntity.ASSISTANT]: 'assistants',
    [GuardrailEntity.WORKFLOW]: 'workflows',
    [GuardrailEntity.KNOWLEDGEBASE]: 'data sources',
  }
  return entityNames[entity]
}

export const getPresetTooltipMessage = (entity: GuardrailEntity): string => {
  const entityName = getEntityHumanizedName(entity)
  return `Applied to all project ${entityName}`
}

export const filterPresetAssignments = (
  assignments: GuardrailAssignment[]
): GuardrailAssignment[] => {
  const projectAssignments = assignments.filter((a) => a.scope === GuardrailEntity.PROJECT)
  const otherAssignments = assignments.filter((a) => a.scope !== GuardrailEntity.PROJECT)

  const projectGuardrailIds = new Set(projectAssignments.map((a) => a.guardrail_id))
  const uniqueOtherAssignments = otherAssignments.filter(
    (a) => !projectGuardrailIds.has(a.guardrail_id)
  )

  return [...projectAssignments, ...uniqueOtherAssignments]
}

export const getFieldError = (fieldPath: string, errors: any): string => {
  const pathParts = fieldPath.split('.')
  let error = errors

  for (const part of pathParts) {
    if (error?.[part]) error = error[part]
    else return ''
  }

  return error?.message
}

export const isPresetGuardrail = (
  guardrailId: string,
  presetAssignments: GuardrailAssignment[]
): boolean => {
  return presetAssignments.some((assignment) => assignment.guardrail_id === guardrailId)
}
