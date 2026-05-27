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

import { UserPreferences } from '@/types/entity/favorites'
import api from '@/utils/api'

const EMPTY_PREFERENCES = (userId: string): UserPreferences => ({
  user_id: userId,
  pinned_assistants: [],
  favorites: { assistants: [], workflows: [], skills: [] },
})

interface PreferencesStoreType {
  preferences: UserPreferences | null
  loading: boolean
  error: string | null
  fetchPreferences: (userId: string) => Promise<void>
  putPreferences: (userId: string, update: Partial<UserPreferences>) => Promise<void>
}

export const preferencesStore = proxy<PreferencesStoreType>({
  preferences: null,
  loading: false,
  error: null,

  async fetchPreferences(userId: string) {
    preferencesStore.loading = true
    preferencesStore.error = null
    try {
      const response = await api.get(`v1/preferences/${userId}`, { skipErrorHandling: true })
      preferencesStore.preferences = await response.json()
    } catch (error: unknown) {
      const status =
        error instanceof Response ? error.status : (error as { status?: number })?.status
      if (status === 404) {
        await preferencesStore.putPreferences(userId, EMPTY_PREFERENCES(userId))
        return
      }
      preferencesStore.error = 'Failed to load preferences'
    } finally {
      preferencesStore.loading = false
    }
  },

  async putPreferences(userId: string, update: Partial<UserPreferences>) {
    const response = await api.put(`v1/preferences/${userId}`, update)
    preferencesStore.preferences = await response.json()
  },
})
