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

import { appInfoStore } from '@/store/appInfo'
import {
  BatchUserModelOverridePayload,
  SetUserModelOverridePayload,
  UserModelOverride,
} from '@/types/entity/userModelOverride'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface UserModelOverridesStore {
  loading: boolean
  error: string | null
  listUserModelOverrides: (projectName: string) => Promise<UserModelOverride[]>
  getUserModelOverride: (projectName: string, userId: string) => Promise<UserModelOverride | null>
  setUserModelOverride: (
    projectName: string,
    userId: string,
    payload: SetUserModelOverridePayload,
    silent?: boolean
  ) => Promise<UserModelOverride>
  deleteUserModelOverride: (projectName: string, userId: string, silent?: boolean) => Promise<void>
  batchUserModelOverrides: (
    projectName: string,
    payload: BatchUserModelOverridePayload,
    silent?: boolean
  ) => Promise<UserModelOverride[]>
}

export const userModelOverridesStore = proxy<UserModelOverridesStore>({
  loading: false,
  error: null,

  async listUserModelOverrides(projectName: string) {
    this.loading = true
    this.error = null

    try {
      // The endpoint pages at up to 500 records per call (ordered by user_id) and returns no
      // total; a 100-record limit matches other project-scoped list calls in this file, so a
      // project with more overrides than the page size needs repeated requests until a page
      // comes back shorter than the limit.
      const limit = 100
      const allOverrides: UserModelOverride[] = []
      let skip = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Each page's skip depends on the previous page's result, so the requests cannot run
        // in parallel the way fetchAllMatchingUsers does with a known total.
        // eslint-disable-next-line no-await-in-loop
        const response = await api.get(
          `v1/projects/${encodeURIComponent(projectName)}/user-model-overrides`,
          {
            params: { skip, limit },
            skipErrorHandling: true,
          }
        )
        // eslint-disable-next-line no-await-in-loop
        const page = (await response.json()) as UserModelOverride[]
        allOverrides.push(...page)
        if (page.length < limit) break
        skip += limit
      }
      return allOverrides
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load model overrides'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async getUserModelOverride(projectName: string, userId: string) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(
        `v1/projects/${encodeURIComponent(projectName)}/user-model-overrides/${encodeURIComponent(
          userId
        )}`,
        {
          skipErrorHandling: true,
        }
      )
      return (await response.json()) as UserModelOverride
    } catch (error: any) {
      if (error?.status === 404) {
        return null
      }
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load model override'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async setUserModelOverride(
    projectName: string,
    userId: string,
    payload: SetUserModelOverridePayload,
    silent = false
  ) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(
        `v1/projects/${encodeURIComponent(projectName)}/user-model-overrides/${encodeURIComponent(
          userId
        )}`,
        payload,
        {
          skipErrorHandling: true,
        }
      )
      appInfoStore.invalidateProjectLLMModels(projectName)
      return (await response.json()) as UserModelOverride
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to set model override'
      this.error = msg
      if (!silent) toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async deleteUserModelOverride(projectName: string, userId: string, silent = false) {
    this.loading = true
    this.error = null

    try {
      await api.delete(
        `v1/projects/${encodeURIComponent(projectName)}/user-model-overrides/${encodeURIComponent(
          userId
        )}`,
        {
          skipErrorHandling: true,
        }
      )
      appInfoStore.invalidateProjectLLMModels(projectName)
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to delete model override'
      this.error = msg
      if (!silent) toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async batchUserModelOverrides(
    projectName: string,
    payload: BatchUserModelOverridePayload,
    silent = false
  ) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post(
        `v1/projects/${encodeURIComponent(projectName)}/user-model-overrides/batch`,
        payload,
        { skipErrorHandling: true }
      )
      appInfoStore.invalidateProjectLLMModels(projectName)
      return (await response.json()) as UserModelOverride[]
    } catch (error: any) {
      const msg =
        error?.parsedError?.message ?? error?.message ?? 'Failed to update model overrides'
      this.error = msg
      if (!silent) toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },
})
