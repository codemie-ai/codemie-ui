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

import type { UserProfileSettings, UserProfileSettingsPatch } from '@/types/userProfileSettings'
import api from '@/utils/api'

const DEFAULT_PROFILE = (userId: string): UserProfileSettings => ({
  user_id: userId,
  onboarding: { completed: false, completed_flows: [], visited_pages: [] },
  recent_assistant_ids: [],
  last_viewed_release_version: null,
})

interface ProfileSettingsStoreType {
  profileSettings: UserProfileSettings | null
  loading: boolean
  error: string | null
  fetchProfileSettings: (userId: string) => Promise<void>
  saveProfileSettings: (userId: string, patch: UserProfileSettingsPatch) => Promise<void>
}

export const profileSettingsStore = proxy<ProfileSettingsStoreType>({
  profileSettings: null,
  loading: false,
  error: null,

  async fetchProfileSettings(userId: string) {
    profileSettingsStore.loading = true
    profileSettingsStore.error = null
    try {
      const response = await api.get(`v1/user/profile-settings/${userId}`, {
        skipErrorHandling: true,
      })
      profileSettingsStore.profileSettings = await response.json()
    } catch (error: unknown) {
      const status =
        error instanceof Response ? error.status : (error as { status?: number })?.status
      if (status === 404) {
        const defaults = DEFAULT_PROFILE(userId)
        const parse = <T>(raw: string | null, fallback: T): T => {
          try {
            return raw !== null ? (JSON.parse(raw) as T) : fallback
          } catch {
            return fallback
          }
        }

        defaults.onboarding = {
          completed: localStorage.getItem('codemie-onboarding-completed') === 'true',
          completed_flows: parse<string[]>(
            localStorage.getItem(`${userId}_onboarding-completed-flows`),
            []
          ),
          visited_pages: parse<string[]>(
            localStorage.getItem(`${userId}_onboarding-visited-pages`),
            []
          ),
        }

        const recentRaw = parse<{ id?: string }[]>(localStorage.getItem('recentAssistants'), [])
        defaults.recent_assistant_ids = recentRaw
          .slice(0, 3)
          .map((a) => a.id)
          .filter((id): id is string => Boolean(id))

        defaults.last_viewed_release_version = localStorage.getItem(
          'codemie-viewed-release-version'
        )

        await profileSettingsStore.saveProfileSettings(userId, defaults)
        return
      }
      profileSettingsStore.error = 'Failed to load profile settings'
      // Leave profileSettings null so stores use their own fallbacks and the user's
      // localStorage theme is not overwritten by a default value.
    } finally {
      profileSettingsStore.loading = false
    }
  },

  async saveProfileSettings(userId: string, patch: UserProfileSettingsPatch) {
    try {
      const response = await api.put(`v1/user/profile-settings/${userId}`, patch)
      profileSettingsStore.profileSettings = await response.json()
    } catch (error: unknown) {
      console.error('Failed to save profile settings', error)
      throw error
    }
  },
})
