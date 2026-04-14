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
    toolkits: normalizeToolkitsForComparison(initial.toolkits || []),
    mcp_servers: normalizeMcpServersForComparison(initial.mcp_servers || []),
    llm_model_type: normalizeLlmModelField(initial.llm_model_type),
  }
  const normalizedCurrent = {
    ...current,
    icon_url: normalizeStringField(current.icon_url),
    description: normalizeStringField(current.description),
    toolkits: normalizeToolkitsForComparison(current.toolkits || []),
    mcp_servers: normalizeMcpServersForComparison(current.mcp_servers || []),
    llm_model_type: normalizeLlmModelField(current.llm_model_type),
  }

  if (!initial.project || initial.project === '') {
    normalizedInitial.project = normalizedCurrent.project
  }

  return !isEqual(normalizedInitial, normalizedCurrent)
}
