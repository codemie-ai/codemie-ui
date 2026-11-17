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

import type { EffortLevel } from '@/types/entity/assistant'

/**
 * The CodeMie-owned persisted status of a model, mirroring the backend
 * `ModelStatus` enum. A model without a persisted override reads as `enabled`.
 */
export type ModelStatus = 'enabled' | 'disabled' | 'deprecated'

export interface ConfigItem {
  id: string
  settings: {
    enabled: boolean
    value?: string
    availableForExternal?: boolean
    description?: string
    created_by?: string
    icon_url?: string
    type?: string
    name?: string
    url?: string
    slug?: string
    maxProjects?: number
    recentReleaseCount?: number
    text?: string
    message?: string
    linkLabel?: string
    linkRoute?: string
    content?: string
  }
}

export interface ModelOption {
  value: string
  deploymentName?: string
  label: string
  isDefault: boolean
  provider?: string
  isPremium?: boolean
  /** Virtual model that routes each request to one of several concrete models. */
  isRouter?: boolean
  multimodal?: boolean
  supportsImageGeneration?: boolean
  supportsTools?: boolean
  effortLevels?: EffortLevel[]
  temperatureSupported?: boolean
  defaultForCategories?: string[]
  cost?: { input: number; output: number }
  /** Hidden from web chat (forbidden_for_web); offered only through CodeMie CLI and its connectors. */
  cliOnly?: boolean
  status?: ModelStatus
}

export interface RouterTierModel {
  model: string
  label?: string
}

export interface RouterTiers {
  simple: RouterTierModel
  medium: RouterTierModel
  complex: RouterTierModel
  reasoning: RouterTierModel
}

export interface LLMRouterOption {
  value: string
  label: string
  status?: ModelStatus
  isDefault?: boolean
  isPremium?: boolean
  provider?: string
  multimodal?: boolean
  supportsTools?: boolean
  routerType?: string
  strategy?: string
  classifierModel?: string
  tiers: RouterTiers
  /** Hidden from web chat (forbidden_for_web); offered only through CodeMie CLI and its connectors. */
  cliOnly?: boolean
}

export interface SpeechConfig {
  [key: string]: any
}

export interface ChatDisclaimer {
  enabled: boolean
  text: string
}
