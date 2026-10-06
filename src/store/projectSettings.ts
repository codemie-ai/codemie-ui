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
import { ProjectSetting } from '@/types/entity/setting'
import api from '@/utils/api'

const DEFAULT_PER_PAGE = 10
const ALL_SETTINGS_PAGE_SIZE = 100

interface ProjectSettingsStoreType {
  projectSettings: ProjectSetting[]
  projectSettingsPagination: Pagination
  fetchProjectSettings: (
    page?: number,
    perPage?: number,
    filters?: Record<string, unknown>
  ) => Promise<void>
  /** Every integration of one project; leaves the paginated list state untouched. */
  listAllProjectSettings: (projectName: string) => Promise<ProjectSetting[]>
  findProjectSetting: (
    projectName: string,
    credentialType: string,
    alias: string
  ) => Promise<ProjectSetting | undefined>
  findProjectSettingByCredentialType: (
    projectName: string,
    credentialType: string
  ) => Promise<ProjectSetting[]>
  createProjectSetting: (values: Record<string, unknown>) => Promise<ProjectSetting>
  updateProjectSetting: (id: string, values: Record<string, unknown>) => Promise<ProjectSetting>
  deleteProjectSetting: (id: string) => Promise<{ [key: string]: unknown; error?: string }>
}

export const projectSettingsStore = proxy<ProjectSettingsStoreType>({
  projectSettings: [],
  projectSettingsPagination: {
    page: 0,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },

  async fetchProjectSettings(page = 0, perPage = DEFAULT_PER_PAGE, filters = {}) {
    const url = `v1/settings/project?page=${page}&per_page=${perPage}&filters=${encodeURIComponent(
      JSON.stringify(filters)
    )}`
    const response = await api.get(url)
    const result = await response.json()
    const { data, pagination } = result

    projectSettingsStore.projectSettings = data
    projectSettingsStore.projectSettingsPagination = {
      page: pagination.page,
      perPage: pagination.per_page,
      totalPages: pagination.pages,
      totalCount: pagination.total,
    }
  },

  async listAllProjectSettings(projectName) {
    const filters = encodeURIComponent(JSON.stringify({ project: [projectName] }))
    const fetchPage = async (page: number) => {
      const response = await api.get(
        `v1/settings/project?page=${page}&per_page=${ALL_SETTINGS_PAGE_SIZE}&filters=${filters}`
      )
      return response.json() as Promise<{ data: ProjectSetting[]; pagination: { pages: number } }>
    }

    // Page count is only known after the first response, so page 0 goes first; every remaining
    // page's filter/sort snapshot is identical, so those can be fetched in parallel.
    const first = await fetchPage(0)
    const totalPages = Math.max(1, first.pagination.pages)
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 1))
    )
    return [first, ...rest].flatMap((result) => result.data)
  },

  async findProjectSetting(projectName, credentialType, alias) {
    const response = await api.get('v1/settings/project?per_page=10000')
    const json = await response.json()

    return json.data.find((setting: ProjectSetting) => {
      return (
        setting.project_name === projectName &&
        setting.alias === alias &&
        setting.credential_type === credentialType
      )
    })
  },

  async findProjectSettingByCredentialType(projectName, credentialType) {
    let type = credentialType
    let isXrayType = false
    if (credentialType === 'generic_jira_tool') type = 'Jira'
    if (credentialType === 'generic_confluence_tool') type = 'Confluence'
    if (credentialType.toLowerCase().includes('xray')) {
      type = 'Xray'
      isXrayType = true
    }

    const response = await api.get('v1/settings/project')
    const data = await response.json()

    return data.filter((setting: ProjectSetting) => {
      return (
        setting.project_name === projectName &&
        (isXrayType
          ? setting.credential_type.toLowerCase().includes(type.toLowerCase())
          : setting.credential_type.toLowerCase() === type.toLowerCase())
      )
    })
  },

  async createProjectSetting(values) {
    const response = await api.post('v1/settings/project', values, { skipErrorHandling: true })
    return response.json()
  },

  async updateProjectSetting(id, values) {
    const response = await api.put(`v1/settings/project/${id}`, values, { skipErrorHandling: true })
    return response.json()
  },

  async deleteProjectSetting(id) {
    const response = await api.delete(`v1/settings/project/${id}`)
    return response.json()
  },
})
