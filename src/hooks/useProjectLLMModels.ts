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

import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { ModelOption } from '@/types/entity/configuration'
import { routerToModelOption } from '@/utils/routerToModelOption'

const EMPTY_MODELS: readonly ModelOption[] = []

/**
 * LLM models selectable in `projectName`, i.e. the platform list narrowed by the project's
 * model settings (and the current user's member override). Without a project it returns the
 * unfiltered platform list, so callers outside a project context keep working unchanged.
 * Routers are part of the list either way, flagged `isRouter`.
 */
export const useProjectLLMModels = (projectName?: string | null): readonly ModelOption[] => {
  const { llmModels, llmRouters, projectLlmModels } = useSnapshot(appInfoStore)
  const projectModels = projectName ? projectLlmModels[projectName] : undefined
  const platformModels = useMemo<ModelOption[]>(
    () => [...llmModels, ...llmRouters.map(routerToModelOption)],
    [llmModels, llmRouters]
  )

  useEffect(() => {
    if (!projectName) {
      appInfoStore.getLLMModels()
      return
    }
    if (!appInfoStore.projectLlmModels[projectName]) {
      appInfoStore.getProjectLLMModels(projectName)
    }
  }, [projectName, projectModels])

  if (!projectName) return platformModels
  return projectModels ?? EMPTY_MODELS
}
