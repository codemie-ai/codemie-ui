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

import { PaginatedResponse, Pagination } from '@/types/common'
import { Project, ProjectRequest } from '@/types/entity/project'
import { ProjectDetail } from '@/types/entity/projectManagement'
import api from '@/utils/api'

interface ProjectsStore {
  projects: Project[]
  selectedProject: Project | null
  pagination: Pagination
  loading: boolean
  error: string | null
  indexProjects: (
    page?: number,
    perPage?: number,
    search?: string | undefined
  ) => Promise<Project[]>
  searchProjects: (
    search: string,
    page?: number,
    perPage?: number
  ) => Promise<PaginatedResponse<Project>>
  getProject: (projectName: string) => Promise<ProjectDetail>
  createProject: (data: ProjectRequest) => Promise<Project>
  updateProject: (id: string, data: ProjectRequest) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  assignUserToProject: (projectName: string, userId: string, isAdmin: boolean) => Promise<void>
  updateUserProjectAssignment: (
    projectName: string,
    userId: string,
    isAdmin: boolean
  ) => Promise<void>
  removeUserFromProject: (projectName: string, userId: string) => Promise<void>
  bulkAssignUsersToProject: (
    projectName: string,
    assignments: Array<{ userId: string; isAdmin: boolean }>
  ) => Promise<void>
  bulkRemoveUsersFromProject: (projectName: string, userIds: string[]) => Promise<void>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

export const projectsStore = proxy<ProjectsStore>({
  projects: [],
  selectedProject: null,
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,

  async indexProjects(
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
    search: string | undefined = undefined
  ) {
    this.loading = true
    this.error = null

    try {
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      }
      if (search) params.search = search

      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
      const queryString = queryParams.toString()
      const url = queryString ? `v1/projects?${queryString}` : 'v1/projects'

      const response = await api.get(url)
      const responseData = await response.json()

      const projects = (responseData.data || []).map((project: any) => ({
        ...project,
        id: project.name, // Use name as ID since backend doesn't provide id field
      }))

      const pagination = responseData.pagination || {}
      this.projects = projects
      this.pagination = {
        page: pagination.page ?? page,
        perPage: pagination.per_page ?? perPage,
        totalPages: Math.ceil((pagination.total ?? 0) / (pagination.per_page ?? perPage)),
        totalCount: pagination.total ?? 0,
      }

      return projects
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to load projects: ${contextualError}`
      console.error('Projects Store Error (indexProjects):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async getProject(projectName: string) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(`v1/projects/${encodeURIComponent(projectName)}`)
      const data = await response.json()

      const project = {
        ...data,
        id: data.name, // Use name as ID since backend doesn't provide id field
      }

      this.selectedProject = project
      return project
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to load project: ${contextualError}`
      console.error('Projects Store Error (getProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async searchProjects(search: string, page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE) {
    try {
      const response = await api.get('v1/projects', {
        params: {
          search,
          page,
          per_page: perPage,
        },
        skipErrorHandling: true,
      })
      const responseData = await response.json()

      return {
        data: (responseData.data || []).map((project: any) => ({
          ...project,
          id: project.name,
        })),
        pagination: responseData.pagination,
      }
    } catch (error: any) {
      console.error('Projects Store Error (searchProjects):', error)
      throw error
    }
  },

  async createProject(data: ProjectRequest) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post(
        'v1/projects',
        {
          ...data,
          cost_center_id: data.cost_center_id ?? undefined,
        },
        { skipErrorHandling: true }
      )
      const result = await response.json()

      const project = {
        ...result,
        id: result.name,
      }

      this.projects.unshift(project)
      this.pagination.totalCount += 1

      return project
    } catch (error: any) {
      console.error('Projects Store Error (createProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async updateProject(id: string, data: ProjectRequest) {
    this.loading = true
    this.error = null

    try {
      const response = await api.patch(
        `v1/projects/${encodeURIComponent(id)}`,
        {
          name: data.name,
          description: data.description,
          cost_center_id: data.clear_cost_center ? undefined : data.cost_center_id,
          clear_cost_center: data.clear_cost_center || undefined,
        },
        {
          skipErrorHandling: true,
        }
      )
      const result = await response.json()

      const project = {
        ...result,
        id: result.name,
      }

      const index = this.projects.findIndex((p) => p.id === id)
      if (index !== -1) {
        this.projects[index] = project
      }

      return project
    } catch (error: any) {
      console.error('Projects Store Error (updateProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async deleteProject(id: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/projects/${id}`)

      this.projects = this.projects.filter((p) => p.id !== id)
      this.pagination.totalCount -= 1
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to delete project: ${contextualError}`
      console.error('Projects Store Error (deleteProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async assignUserToProject(projectName: string, userId: string, isAdmin: boolean) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post(`v1/projects/${encodeURIComponent(projectName)}/assignment`, {
        user_id: userId,
        is_admin: isAdmin,
      })
      await response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to assign user to project: ${contextualError}`
      console.error('Projects Store Error (assignUserToProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async updateUserProjectAssignment(projectName: string, userId: string, isAdmin: boolean) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(
        `v1/projects/${encodeURIComponent(projectName)}/assignment/${encodeURIComponent(userId)}`,
        {
          is_admin: isAdmin,
        }
      )
      await response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to update user assignment: ${contextualError}`
      console.error('Projects Store Error (updateUserProjectAssignment):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async removeUserFromProject(projectName: string, userId: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(
        `v1/projects/${encodeURIComponent(projectName)}/assignment/${encodeURIComponent(userId)}`
      )
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to remove user from project: ${contextualError}`
      console.error('Projects Store Error (removeUserFromProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async bulkAssignUsersToProject(
    projectName: string,
    assignments: Array<{ userId: string; isAdmin: boolean }>
  ) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post(
        `v1/projects/${encodeURIComponent(projectName)}/assignments`,
        {
          assignments: assignments.map((a) => ({
            user_id: a.userId,
            is_admin: a.isAdmin,
          })),
        }
      )
      await response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to bulk assign users: ${contextualError}`
      console.error('Projects Store Error (bulkAssignUsersToProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async bulkRemoveUsersFromProject(projectName: string, userIds: string[]) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/projects/${encodeURIComponent(projectName)}/assignments`, {
        user_ids: userIds,
      })
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to bulk remove users: ${contextualError}`
      console.error('Projects Store Error (bulkRemoveUsersFromProject):', error)
      throw error
    } finally {
      this.loading = false
    }
  },
})
