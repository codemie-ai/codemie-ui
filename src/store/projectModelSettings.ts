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

import { proxy } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import {
  DEFAULT_PROJECT_MODEL_SETTINGS,
  MemberModelOverride,
  ProjectModelSettings,
} from '@/types/entity/projectModelSettings'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface ProjectModelSettingsStore {
  settingsByProject: Record<string, ProjectModelSettings>
  loading: boolean
  saving: boolean
  error: string | null
  fetchSettings: (projectName: string) => Promise<ProjectModelSettings>
  saveSettings: (
    projectName: string,
    settings: ProjectModelSettings
  ) => Promise<ProjectModelSettings>
  saveMemberOverrides: (
    projectName: string,
    overrides: Record<string, MemberModelOverride | null>
  ) => Promise<ProjectModelSettings>
}

const projectUrl = (projectName: string) => `v1/projects/${encodeURIComponent(projectName)}`

const allowedModelsUrl = (projectName: string) => `${projectUrl(projectName)}/allowed-models`

const getErrorMessage = (error: any, fallback: string): string =>
  error?.parsedError?.details ?? error?.parsedError?.message ?? error?.message ?? fallback

/**
 * The backend only stores a flat allow-list (`allowed_models`/`default_model`) — there is no
 * deny-list, premium-hiding, auto-routing toggle or member-override concept server-side. Those
 * fields stay at their client-side defaults; only mode/models/default_model round-trip.
 */
const fromProjectResponse = (data: {
  allowed_models?: string[] | null
  default_model?: string | null
}): ProjectModelSettings => ({
  ...DEFAULT_PROJECT_MODEL_SETTINGS,
  mode: data.allowed_models != null ? 'allow_list' : 'all',
  models: data.allowed_models ?? [],
  default_model: data.default_model ?? null,
})

export const projectModelSettingsStore = proxy<ProjectModelSettingsStore>({
  settingsByProject: {},
  loading: false,
  saving: false,
  error: null,

  async fetchSettings(projectName) {
    this.loading = true
    this.error = null
    try {
      // Callers render their own inline state; a viewer without access must not get a toast.
      const response = await api.get(projectUrl(projectName), { skipErrorHandling: true })
      const data = fromProjectResponse(await response.json())
      this.settingsByProject[projectName] = data
      return data
    } catch (error: any) {
      this.error = getErrorMessage(error, 'Failed to load project model settings')
      throw error
    } finally {
      this.loading = false
    }
  },

  async saveSettings(projectName, settings) {
    this.saving = true
    this.error = null
    try {
      const payload = {
        allowed_models: settings.mode === 'allow_list' ? settings.models : null,
        default_model: settings.default_model,
      }
      const response = await api.patch(allowedModelsUrl(projectName), payload, {
        skipErrorHandling: true,
      })
      const data = fromProjectResponse(await response.json())
      this.settingsByProject[projectName] = data
      // Model pickers cache the project-scoped list; drop it so they reflect the change.
      appInfoStore.invalidateProjectLLMModels(projectName)
      return data
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to update model settings')
      this.error = message
      toaster.error(message)
      throw error
    } finally {
      this.saving = false
    }
  },

  /** Read-modify-write of member overrides; `null` removes a member's override. */
  async saveMemberOverrides(projectName, overrides) {
    const current = await this.fetchSettings(projectName)
    const memberOverrides = { ...current.member_overrides }
    Object.entries(overrides).forEach(([userId, override]) => {
      if (override && (override.disabled_models.length || override.default_model)) {
        memberOverrides[userId] = override
      } else {
        delete memberOverrides[userId]
      }
    })
    return this.saveSettings(projectName, { ...current, member_overrides: memberOverrides })
  },
})
