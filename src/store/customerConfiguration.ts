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

import {
  SettingDeclaration,
  SettingUpdateResponse,
  SettingValue,
} from '@/types/entity/customerConfiguration'
import api from '@/utils/api'

const DECLARATIONS_URL = 'v1/config/declarations'

interface CustomerConfigurationStore {
  settings: SettingDeclaration[]
  loading: boolean
  error: string | null
  indexSettings: () => Promise<SettingDeclaration[]>
  saveSetting: (
    componentId: string,
    settings: Record<string, SettingValue>
  ) => Promise<SettingUpdateResponse>
  resetSetting: (componentId: string) => Promise<void>
}

const toMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const customerConfigurationStore = proxy<CustomerConfigurationStore>({
  settings: [],
  loading: false,
  error: null,

  async indexSettings() {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(DECLARATIONS_URL)
      const settings: SettingDeclaration[] = await response.json()
      this.settings = settings
      return settings
    } catch (error) {
      this.error = toMessage(error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async saveSetting(componentId, settings) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(`${DECLARATIONS_URL}/${componentId}`, { settings })
      return await response.json()
    } catch (error) {
      this.error = toMessage(error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async resetSetting(componentId) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`${DECLARATIONS_URL}/${componentId}`)
    } catch (error) {
      this.error = toMessage(error)
      throw error
    } finally {
      this.loading = false
    }
  },
})
