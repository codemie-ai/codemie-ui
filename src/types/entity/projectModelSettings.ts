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

/**
 * How `ProjectModelSettings.models` is interpreted: `all` ignores the list, `allow_list`
 * exposes only listed models (models added later stay hidden), `deny_list` hides only listed
 * models (models added later become visible).
 */
export type ModelAvailabilityMode = 'all' | 'allow_list' | 'deny_list'

export interface MemberModelOverride {
  disabled_models: string[]
  default_model: string | null
}

export interface ProjectModelSettings {
  mode: ModelAvailabilityMode
  models: string[]
  default_model: string | null
  hide_premium_models: boolean
  auto_routing_enabled: boolean
  member_overrides: Record<string, MemberModelOverride>
}

export const DEFAULT_PROJECT_MODEL_SETTINGS: ProjectModelSettings = {
  mode: 'all',
  models: [],
  default_model: null,
  hide_premium_models: false,
  auto_routing_enabled: true,
  member_overrides: {},
}
