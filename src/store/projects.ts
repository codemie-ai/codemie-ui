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
import { BudgetCategory } from '@/types/entity/budget'
import { Project, ProjectRequest } from '@/types/entity/project'
import { ProjectDetail } from '@/types/entity/projectManagement'
import api from '@/utils/api'

interface ImportUserRow {
  email: string
  role: string
  error: string | null
}

interface ImportValidationResult {
  users: ImportUserRow[]
}

interface ImportUsersResult {
  total: number
}

interface ProjectsStore {
  projects: Project[]
  selectedProject: Project | null
  pagination: Pagination
  loading: boolean
  error: string | null
  indexProjects: (
    page?: number,
    perPage?: number,
    search?: string | undefined,
    sortBy?: string | undefined,
    sortOrder?: string | undefined,
    includeSpending?: boolean,
    budgetParams?: {
      includeBudgets?: boolean
      hasAssignedBudgets?: boolean
      budgetCategory?: BudgetCategory | null
    }
  ) => Promise<Project[]>
  searchProjects: (
    search: string,
    page?: number,
    perPage?: number
  ) => Promise<PaginatedResponse<Project>>
  searchProjectsIncludingDisplayName: (
    page: number,
    perPage: number,
    search: string,
    sortBy?: string,
    sortOrder?: string,
    budgetParams?: {
      includeBudgets?: boolean
      hasAssignedBudgets?: boolean
      budgetCategory?: BudgetCategory | null
    }
  ) => Promise<Project[]>
  getProject: (projectName: string, includeSpending?: boolean) => Promise<ProjectDetail>
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
  validateImportUsers: (projectId: string, formData: FormData) => Promise<ImportValidationResult>
  importUsers: (projectId: string, formData: FormData) => Promise<ImportUsersResult>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

// Backend caps per_page at 100; this bounds how many pages we'll pull when
// building the full project list for client-side display-name search.
const CLIENT_SEARCH_PAGE_SIZE = 100
const CLIENT_SEARCH_MAX_PAGES = 50

const fetchProjectsPage = async (
  page: number,
  budgetParams: {
    includeBudgets?: boolean
    hasAssignedBudgets?: boolean
    budgetCategory?: BudgetCategory | null
  }
) => {
  const params: Record<string, string | number | boolean> = {
    page,
    per_page: CLIENT_SEARCH_PAGE_SIZE,
  }
  if (budgetParams.includeBudgets) params.include_budgets = true
  if (budgetParams.hasAssignedBudgets) params.has_assigned_budgets = true
  if (budgetParams.budgetCategory) params.budget_category = budgetParams.budgetCategory

  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => queryParams.append(key, String(value)))

  const response = await api.get(`v1/projects?${queryParams.toString()}`)
  const responseData = await response.json()
  const projects: Project[] = (responseData.data || []).map((project: any) => ({
    ...project,
    id: project.name,
  }))

  return { projects, total: responseData.pagination?.total ?? projects.length }
}

const fetchAllProjectsForClientSearch = async (budgetParams: {
  includeBudgets?: boolean
  hasAssignedBudgets?: boolean
  budgetCategory?: BudgetCategory | null
}): Promise<Project[]> => {
  const first = await fetchProjectsPage(0, budgetParams)
  const totalPages = Math.ceil(first.total / CLIENT_SEARCH_PAGE_SIZE)
  const pagesToFetch = Math.min(totalPages, CLIENT_SEARCH_MAX_PAGES)

  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(pagesToFetch - 1, 0) }, (_, i) =>
      fetchProjectsPage(i + 1, budgetParams)
    )
  )

  const all = [first, ...remainingPages].flatMap((result) => result.projects)

  if (all.length < first.total) {
    console.warn(
      `Project display-name search only scanned ${all.length} of ${first.total} projects (page cap reached)`
    )
  }

  return all
}

const sortProjectsClientSide = (
  projects: Project[],
  sortBy?: string,
  sortOrder?: string
): Project[] => {
  if (!sortBy) return projects

  const direction = sortOrder === 'desc' ? -1 : 1
  return [...projects].sort((a, b) => {
    const aValue = String((a as any)[sortBy] ?? '')
    const bValue = String((b as any)[sortBy] ?? '')
    return aValue.localeCompare(bValue) * direction
  })
}

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
    search: string | undefined = undefined,
    sortBy: string | undefined = undefined,
    sortOrder: string | undefined = undefined,
    includeSpending = false,
    budgetParams: {
      includeBudgets?: boolean
      hasAssignedBudgets?: boolean
      budgetCategory?: BudgetCategory | null
    } = {}
  ) {
    this.loading = true
    this.error = null

    try {
      const params: Record<string, string | number | boolean> = {
        page,
        per_page: perPage,
      }
      if (search) params.search = search
      if (sortBy) {
        params.sort_by = sortBy
        if (sortOrder) params.sort_order = sortOrder
      }
      if (includeSpending) params.include_spending = true
      if (budgetParams.includeBudgets) params.include_budgets = true
      if (budgetParams.hasAssignedBudgets) params.has_assigned_budgets = true
      if (budgetParams.budgetCategory) params.budget_category = budgetParams.budgetCategory

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

  // The backend's `search` query param only matches a project's technical
  // `name` and `description` — never `display_name` (see EPMCDME-13486). Since
  // Super Admins need to find projects by display name even when they aren't
  // a member (and so have no roster entry for it), we fetch every visible
  // project and match `search` against name/display_name/description here
  // instead of relying on the backend filter.
  async searchProjectsIncludingDisplayName(
    page: number,
    perPage: number,
    search: string,
    sortBy?: string,
    sortOrder?: string,
    budgetParams: {
      includeBudgets?: boolean
      hasAssignedBudgets?: boolean
      budgetCategory?: BudgetCategory | null
    } = {}
  ) {
    this.loading = true
    this.error = null

    try {
      const allProjects = await fetchAllProjectsForClientSearch(budgetParams)

      const query = search.trim().toLowerCase()
      const matches = allProjects.filter((project) => {
        const name = (project.name ?? '').toLowerCase()
        const displayName = (project.display_name ?? '').toLowerCase()
        const description = (project.description ?? '').toLowerCase()
        return name.includes(query) || displayName.includes(query) || description.includes(query)
      })

      const sorted = sortProjectsClientSide(matches, sortBy, sortOrder)
      const start = page * perPage
      const projects = sorted.slice(start, start + perPage)

      this.projects = projects
      this.pagination = {
        page,
        perPage,
        totalPages: Math.ceil(sorted.length / perPage) || 0,
        totalCount: sorted.length,
      }

      return projects
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to load projects: ${contextualError}`
      console.error('Projects Store Error (searchProjectsIncludingDisplayName):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async getProject(projectName: string, includeSpending = false) {
    this.loading = true
    this.error = null

    try {
      const url = includeSpending
        ? `v1/projects/${encodeURIComponent(projectName)}?include_spending=true`
        : `v1/projects/${encodeURIComponent(projectName)}`
      const response = await api.get(url)
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
          display_name: data.display_name,
          description: data.description,
          cost_center_id: data.clear_cost_center ? undefined : data.cost_center_id,
          clear_cost_center: data.clear_cost_center || undefined,
          enforce_member_spend_limits: data.enforce_member_spend_limits,
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

  async validateImportUsers(projectId: string, formData: FormData) {
    try {
      const response = await api.postMultipart(
        `v1/projects/${projectId}/import-users/validate`,
        formData
      )
      return await response.json()
    } catch (error: any) {
      console.error('Projects Store Error (validateImportUsers):', error)
      throw error
    }
  },

  async importUsers(projectId: string, formData: FormData) {
    try {
      const response = await api.postMultipart(`v1/projects/${projectId}/import-users`, formData)
      return await response.json()
    } catch (error: any) {
      console.error('Projects Store Error (importUsers):', error)
      throw error
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
