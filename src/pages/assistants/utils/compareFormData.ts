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

import isEqual from 'lodash/isEqual'

import { appInfoStore } from '@/store/appInfo'

import { normalizeMcpServersForComparison } from './normalizeMcpServersForComparison'
import { normalizeToolkitsForComparison } from './normalizeToolkitsForComparison'

const normalizeStringField = (value: string | null | undefined): string => {
  return value ?? ''
}

const normalizeBooleanField = (value: boolean | null | undefined): boolean => {
  return value ?? false
}

const normalizeStringArrayField = (value: string[] | null | undefined): string[] => {
  return Array.isArray(value) ? value : []
}

const getDefaultLlmModel = (): string | undefined => {
  const models = appInfoStore.llmModels
  return (models.find((m) => m.isDefault) ?? models[0])?.value
}

const normalizeLlmModelField = (value: string | null | undefined): string => {
  return value || getDefaultLlmModel() || ''
}

/**
 * Compares initial and current form data to detect changes
 * @param initial - Initial form data
 * @param current - Current form data
 * @returns True if data has changed, false otherwise
 */
export const compareFormData = (initial: any, current: any) => {
  const normalizedInitial = {
    ...initial,
    icon_url: normalizeStringField(initial.icon_url),
    description: normalizeStringField(initial.description),
    enable_image_generation: normalizeBooleanField(initial.enable_image_generation),
    image_generation_model: normalizeStringField(initial.image_generation_model),
    toolkits: normalizeToolkitsForComparison(initial.toolkits || []),
    mcp_servers: normalizeMcpServersForComparison(initial.mcp_servers || []),
    llm_model_type: normalizeLlmModelField(initial.llm_model_type),
    enabled_builtin_subagents: normalizeStringArrayField(initial.enabled_builtin_subagents),
  }
  const normalizedCurrent = {
    ...current,
    icon_url: normalizeStringField(current.icon_url),
    description: normalizeStringField(current.description),
    enable_image_generation: normalizeBooleanField(current.enable_image_generation),
    image_generation_model: normalizeStringField(current.image_generation_model),
    toolkits: normalizeToolkitsForComparison(current.toolkits || []),
    mcp_servers: normalizeMcpServersForComparison(current.mcp_servers || []),
    llm_model_type: normalizeLlmModelField(current.llm_model_type),
    enabled_builtin_subagents: normalizeStringArrayField(current.enabled_builtin_subagents),
  }

  if (!initial.project || initial.project === '') {
    normalizedInitial.project = normalizedCurrent.project
  }

  return !isEqual(normalizedInitial, normalizedCurrent)
}
