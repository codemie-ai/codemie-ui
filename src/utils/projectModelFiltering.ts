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

import { projectsStore } from '../store/projects'

export interface LLMModel {
  value: string
  label: string
  isPremium?: boolean
}

/**
 * Get filtered models for a project, or all models if no project or no restrictions
 */
export async function getFilteredModelsForProject(
  projectId: string | undefined,
  allModels: LLMModel[]
): Promise<LLMModel[]> {
  if (!projectId) {
    return allModels
  }

  // Normalize versioned model ids (e.g. o3-mini-2025-01-31) to alias ids (o3-mini)
  // so project.allowed_models can use versioned ids while the catalog uses aliases.
  const normalizeModelId = (id: string) => id.replace(/-\d{4}-\d{2}-\d{2}$/, '')

  try {
    const project = await projectsStore.getProject(projectId, true)

    if (!project?.allowed_models || project.allowed_models.length === 0) {
      return allModels
    }

    const allowedSet = new Set((project.allowed_models ?? []).map(normalizeModelId))
    const filtered = allModels.filter((model) => allowedSet.has(normalizeModelId(model.value)))

    if (filtered.length === 0) {
      console.warn(
        '[projectModelFiltering] allowed_models matched 0 catalog models for project',
        projectId,
        'Returning empty list. Fix allowed_models to match catalog model IDs (llmModels[].value).'
      )
      return []
    }
    return filtered
  } catch (error) {
    console.error('[projectModelFiltering] Error fetching project config:', error)
    return allModels
  }
}
