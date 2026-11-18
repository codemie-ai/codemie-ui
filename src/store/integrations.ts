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

import { projectSettingsStore } from '@/store/projectSettings'
import { userSettingsStore } from '@/store/userSettings'
import { Pagination } from '@/types/common'
import { Setting } from '@/types/entity/setting'
import api from '@/utils/api'
import { IntegrationScope, IntegrationScopeValue, ScopeFilterValue } from '@/utils/integrationScope'

const DEFAULT_PER_PAGE = 10

/** Identifies a just-saved row without `id` (the Project create returns none). */
export type SavedRowKey = {
  scope: IntegrationScope
  project_name: string
  credential_type: string
  alias: string
}

interface FetchSettingsArgs {
  scope: ScopeFilterValue
  filters: Record<string, unknown>
  page: number
  perPage: number
}

interface IntegrationsStoreType {
  settings: Setting[]
  pagination: Pagination
  loading: boolean
  savedRow: SavedRowKey | null
  fetchSettings: (args: FetchSettingsArgs) => Promise<void>
  createSetting: (scope: IntegrationScope, body: Record<string, unknown>) => Promise<unknown>
  updateSetting: (
    scope: IntegrationScope,
    id: string,
    body: Record<string, unknown>
  ) => Promise<unknown>
  deleteSetting: (scope: IntegrationScope, id: string) => Promise<unknown>
  setSavedRow: (key: SavedRowKey) => void
  takeSavedRow: () => SavedRowKey | null
}

let fetchRequestId = 0

export const integrationsStore = proxy<IntegrationsStoreType>({
  settings: [],
  pagination: { page: 0, perPage: DEFAULT_PER_PAGE, totalPages: 0, totalCount: 0 },
  loading: false,
  savedRow: null,

  async fetchSettings({ scope, filters, page, perPage }) {
    fetchRequestId += 1
    const requestId = fetchRequestId
    integrationsStore.loading = true
    const url = `v1/settings?scope=${scope}&page=${page}&per_page=${perPage}&filters=${encodeURIComponent(
      JSON.stringify(filters)
    )}`
    try {
      const response = await api.get(url)
      const { data, pagination } = await response.json()
      if (requestId !== fetchRequestId) return
      integrationsStore.settings = data
      integrationsStore.pagination = {
        page: pagination.page,
        perPage: pagination.per_page,
        totalPages: pagination.pages,
        totalCount: pagination.total,
      }
    } finally {
      if (requestId === fetchRequestId) integrationsStore.loading = false
    }
  },

  createSetting(scope, body) {
    return scope === IntegrationScope.USER
      ? userSettingsStore.createUserSetting(body)
      : projectSettingsStore.createProjectSetting(body)
  },

  updateSetting(scope, id, body) {
    return scope === IntegrationScope.USER
      ? userSettingsStore.updateUserSetting(id, body)
      : projectSettingsStore.updateProjectSetting(id, body)
  },

  deleteSetting(scope, id) {
    return scope === IntegrationScope.USER
      ? userSettingsStore.deleteUserSetting(id)
      : projectSettingsStore.deleteProjectSetting(id)
  },

  setSavedRow(key) {
    integrationsStore.savedRow = key
  },

  takeSavedRow() {
    const key = integrationsStore.savedRow
    integrationsStore.savedRow = null
    return key
  },
})

export const editRouteName = (scope: IntegrationScopeValue) =>
  scope === IntegrationScope.USER ? 'edit-user-integration' : 'edit-project-integration'

const normalized = (value?: string | null) => (value ?? '').trim()

// The key comes from form values, the row from the backend: an empty project may come back as
// null and a type in another case, so compare the normalized forms.
export const matchesSavedRow = (row: Setting, key: SavedRowKey): boolean =>
  row.setting_type === key.scope &&
  normalized(row.project_name) === normalized(key.project_name) &&
  normalized(row.credential_type).toLowerCase() === normalized(key.credential_type).toLowerCase() &&
  normalized(row.alias) === normalized(key.alias)
