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

import { proxy } from 'valtio'

import api from '@/utils/api'

export interface ProjectLlmModelDto {
  deployment_name: string
  label: string
  enabled: boolean
  default: boolean
  is_premium?: boolean
}

export interface ProjectLlmModelOption {
  value: string
  label: string
  isDefault?: boolean
  isPremium?: boolean
}

export const llmModelsStore = proxy({
  async getProjectEnabledModels(projectId: string): Promise<ProjectLlmModelOption[]> {
    const resp = await api.get('v1/llm_models', { params: { project_id: projectId } })
    const dtos = (await resp.json()) as ProjectLlmModelDto[]
    return dtos
      .filter((m) => m.enabled)
      .map((m) => ({
        value: m.deployment_name,
        label: m.label,
        isDefault: m.default,
        isPremium: m.is_premium ?? false,
      }))
  },
})
