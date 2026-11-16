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

import { AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'

export interface ModelsFilters {
  search: string
  provider: string | null
  statuses: ModelStatus[]
  premiumOnly: boolean
}

export const MODELS_FILTERS_INITIAL_STATE: ModelsFilters = {
  search: '',
  provider: null,
  statuses: [],
  premiumOnly: false,
}

export const hasActiveModelsFilters = (filters: ModelsFilters): boolean =>
  !!filters.search.trim() ||
  !!filters.provider ||
  filters.statuses.length > 0 ||
  filters.premiumOnly

export const filterAdminModels = (
  models: ReadonlyArray<AdminModel>,
  filters: ModelsFilters
): AdminModel[] => {
  const query = filters.search.trim().toLowerCase()
  return models.filter(
    (m) =>
      (!query ||
        m.label.toLowerCase().includes(query) ||
        m.base_name.toLowerCase().includes(query)) &&
      (!filters.provider || m.provider === filters.provider) &&
      (filters.statuses.length === 0 || filters.statuses.includes(m.status)) &&
      (!filters.premiumOnly || !!m.isPremium)
  )
}
