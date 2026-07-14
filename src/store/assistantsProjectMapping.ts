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
import { Assistant } from '@/types/entity/assistant'
import api from '@/utils/api'

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 12

interface AssistantsProjectMappingStore {
  assistants: Assistant[]
  pagination: Pagination
  loading: boolean
  error: string | null
  fetchMappings: (project: string, page?: number, perPage?: number) => Promise<void>
  addMapping: (assistantId: string, projectName: string) => Promise<void>
  removeMapping: (assistantId: string, projectName: string) => Promise<void>
}

export const assistantsProjectMappingStore = proxy<AssistantsProjectMappingStore>({
  assistants: [],
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,

  async fetchMappings(project, page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE) {
    this.loading = true
    this.error = null
    this.assistants = []
    this.pagination.page = 0

    try {
      const url = `v1/assistants/projects/mapping?feature=teams&project=${encodeURIComponent(
        project
      )}&page=${page}&per_page=${perPage}`
      const response = await api.get(url)
      const data = await response.json()

      this.assistants = data.data ?? []
      this.pagination = {
        page: data.pagination?.page ?? 0,
        perPage: data.pagination?.per_page ?? perPage,
        totalPages: data.pagination?.pages ?? 0,
        totalCount: data.pagination?.total ?? 0,
      }
    } catch (error: any) {
      this.error = `Failed to fetch assistant mappings: ${error.message}`
      throw error
    } finally {
      this.loading = false
    }
  },

  async addMapping(assistantId, projectName) {
    const response = await api.post(`v1/assistants/${assistantId}/projects/mapping`, {
      project_name: projectName,
      feature: 'teams',
    })
    await response.json()
    await this.fetchMappings(projectName, this.pagination.page, this.pagination.perPage)
  },

  async removeMapping(assistantId, projectName) {
    try {
      const url = `v1/assistants/${assistantId}/projects/mapping?project=${encodeURIComponent(
        projectName
      )}&feature=teams`
      const response = await api.delete(url)
      await response.json()
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return
      }
      throw error
    }
    await this.fetchMappings(projectName, this.pagination.page, this.pagination.perPage)
  },
})
