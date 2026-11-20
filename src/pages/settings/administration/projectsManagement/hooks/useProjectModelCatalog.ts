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

import { useEffect, useState } from 'react'

import { appInfoStore } from '@/store/appInfo'
import { projectModelSettingsStore } from '@/store/projectModelSettings'
import { ModelOption } from '@/types/entity/configuration'
import { ProjectModelSettings } from '@/types/entity/projectModelSettings'
import { routerToModelOption } from '@/utils/routerToModelOption'

import {
  getConfigurableModels,
  isModelAvailable,
  ProjectModelSetting,
  settingsToSelection,
} from '../components/projectModelConfiguration'

export interface ProjectModelCatalog {
  /** The platform list as loaded, routers last when they are included. */
  catalog: ModelOption[]
  /** `catalog` with each model ID listed once. */
  models: ModelOption[]
  settings: ProjectModelSettings
  /** The project's stored selection for every entry of `models`. */
  selection: Record<string, ProjectModelSetting>
  /** Whether the project makes each model available, keyed by model ID. */
  availability: Record<string, boolean>
}

interface Options {
  /** Adds the CLI-only routers, which a project's selection also covers. */
  includeRouters: boolean
  /** Applies the project's `hide_premium_models` setting to `availability`. */
  hidePremium: boolean
  enabled?: boolean
}

interface State {
  data: ProjectModelCatalog | null
  error: unknown
}

const loadCatalog = async (includeRouters: boolean): Promise<ModelOption[]> => {
  if (!includeRouters) return appInfoStore.getLLMModels()
  const { models, routers } = await appInfoStore.getLLMCatalog()
  return [...models, ...routers.map(routerToModelOption)]
}

/** Loads the platform models and a project's model settings and derives the project's selection. */
export const useProjectModelCatalog = (
  projectName: string,
  { includeRouters, hidePremium, enabled = true }: Options
): State => {
  const [state, setState] = useState<State>({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    setState({ data: null, error: null })
    if (!enabled) {
      return () => {
        cancelled = true
      }
    }

    Promise.all([loadCatalog(includeRouters), projectModelSettingsStore.fetchSettings(projectName)])
      .then(([catalog, settings]) => {
        if (cancelled) return
        const models = getConfigurableModels(catalog)
        const selection = settingsToSelection(settings, models)
        const hidePremiumModels = hidePremium && settings.hide_premium_models
        const availability = Object.fromEntries(
          models.map((model) => [
            model.value,
            isModelAvailable(model, selection, hidePremiumModels),
          ])
        )
        setState({ data: { catalog, models, settings, selection, availability }, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error })
      })
    return () => {
      cancelled = true
    }
  }, [projectName, includeRouters, hidePremium, enabled])

  return state
}
