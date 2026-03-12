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

import { Pagination } from '@/types/common'
import { UserSetting } from '@/types/entity/setting'
import api from '@/utils/api'

const DEFAULT_PER_PAGE = 10

interface UserSettingsStoreType {
  userSettings: UserSetting[]
  userSettingsPagination: Pagination
  settings: Record<string, UserSetting[]>
  isSettingsIndexed: boolean
  indexSettings: () => Promise<void>
  fetchUserSettings: (
    page?: number | null,
    perPage?: number | null,
    filters?: Record<string, unknown>
  ) => Promise<void>
  findUserSetting: (
    projectName: string,
    credentialType: string,
    alias: string
  ) => Promise<UserSetting | undefined>
  findUserSettingByCredentialType: (
    projectName: string,
    credentialType: string
  ) => Promise<UserSetting[]>
  getSettings: () => Record<string, UserSetting[]>
  getUserSettings: () => Promise<UserSetting[]>
  createUserSetting: (values: Record<string, unknown>) => Promise<UserSetting>
  updateUserSetting: (id: string, values: Record<string, unknown>) => Promise<UserSetting>
  deleteUserSetting: (id: string) => Promise<UserSetting>
  testSetting: (type: string, setting_id?: string, values?: Record<string, unknown>) => Promise<any>
  resetIsSettingsIndexed: () => void
}

export const userSettingsStore = proxy<UserSettingsStoreType>({
  userSettings: [],
  userSettingsPagination: {
    page: 0,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  settings: {},
  isSettingsIndexed: false,

  async fetchUserSettings(page = 0, perPage = DEFAULT_PER_PAGE, filters = {}) {
    const url = `v1/settings/user?page=${page}&per_page=${perPage}&filters=${encodeURIComponent(
      JSON.stringify(filters)
    )}&`
    const response = await api.get(url)
    const result = await response.json()
    const { data, pagination } = result

    userSettingsStore.userSettings = data
    userSettingsStore.userSettingsPagination = {
      page: pagination.page,
      perPage: pagination.per_page,
      totalPages: pagination.pages,
      totalCount: pagination.total,
    }
  },

  async findUserSetting(projectName, credentialType, alias) {
    const response = await api.get('v1/settings/user?per_page=10000')
    const result = await response.json()
    return result.data.find(
      (setting: UserSetting) =>
        setting.project_name === projectName &&
        setting.alias === alias &&
        setting.credential_type === credentialType
    )
  },

  async findUserSettingByCredentialType(projectName, credentialType) {
    let type = credentialType
    let isXrayType = false
    if (credentialType === 'generic_jira_tool') type = 'Jira'
    else if (credentialType === 'generic_confluence_tool') type = 'Confluence'
    else if (credentialType.toLowerCase().includes('xray')) {
      type = 'Xray'
      isXrayType = true
    }

    const response = await api.get('v1/settings/user')
    const result = await response.json()

    return result.filter(
      (setting: UserSetting) =>
        setting.project_name === projectName &&
        (isXrayType
          ? setting.credential_type.toLowerCase().includes(type.toLowerCase())
          : setting.credential_type.toLowerCase() === type.toLowerCase())
    )
  },

  async getUserSettings() {
    const response = await api.get('v1/settings/user')
    return response.json()
  },

  async createUserSetting(values) {
    const response = await api.post('v1/settings/user', values, { skipErrorHandling: true })
    return response.json()
  },

  async updateUserSetting(id, values) {
    const response = await api.put(`v1/settings/user/${id}`, values, { skipErrorHandling: true })
    return response.json()
  },

  async deleteUserSetting(id) {
    const response = await api.delete(`v1/settings/user/${id}`)
    return response.json()
  },

  async testSetting(type, setting_id, values) {
    const body: any = { credential_type: type }
    if (setting_id) body.setting_id = setting_id
    if (values) body.credential_values = values

    const response = await api.post('v1/settings/test/', body)
    return response.json()
  },

  async indexSettings() {
    const isIndexed = userSettingsStore.isSettingsIndexed
    userSettingsStore.isSettingsIndexed = true
    if (isIndexed) return
    const response = await api.get('v1/settings/user/available')
    const settings: UserSetting[] = await response.json()

    const grouped: Record<string, UserSetting[]> = {}

    settings.forEach((setting) => {
      const ctLower = setting.credential_type.toLowerCase()
      if (!grouped[ctLower]) {
        grouped[ctLower] = []
      }
      grouped[ctLower].push(setting)
    })

    userSettingsStore.settings = grouped
  },

  getSettings() {
    return userSettingsStore.settings
  },
  resetIsSettingsIndexed() {
    userSettingsStore.isSettingsIndexed = false
  },
})
