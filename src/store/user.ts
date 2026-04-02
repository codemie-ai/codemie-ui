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

import type { AnalyticsQueryParams } from '@/types/analytics'
import { ProjectRole, ProjectRoleBE } from '@/types/entity/project'
import { User, UserData, GetUsersResponse, UserListItem, UserType } from '@/types/entity/user'
import api from '@/utils/api'
import toaster from '@/utils/toaster'
import { formatUserOptions } from '@/utils/user'

api.redirectHandler = () => {
  userStore.isSessionExpired = true
}

interface UserStoreType {
  isSessionExpired: boolean
  isLoadingUser: boolean
  user: User | null
  userData: UserData | null

  isSSOUser: () => boolean
  loadUser: () => Promise<void>
  getUserData: () => Promise<void>
  loadIndexUsers: () => Promise<User[]>
  loadAssistantsUsers: (params?: { scope?: string }) => Promise<User[]>
  loadSkillsUsers: () => Promise<User[]>
  getAnalyticsUsers: (
    filters?: AnalyticsQueryParams
  ) => Promise<Array<{ label: string; value: string }>>
  loadWorkflowsUsers: () => Promise<User[]>
  loadProjectSettingsUsers: () => Promise<User[]>
  searchUsers: (query: string, perPage?: number) => Promise<UserListItem[]>
  assignUserToProject: (projectName: string, userId: string, role: string) => Promise<void>
  updateUserProjectRole: (projectName: string, userId: string, role: string) => Promise<void>
  unassignUserFromProject: (projectName: string, userId: string) => Promise<void>
  getCurrentUser: () => Promise<User>
  getProjects: (query?: string, adminOnly?: boolean) => Promise<string[]>
  getDefaultProject: () => Promise<string | null>
  getAdminProjects: (search?: string) => Promise<string[]>
  getUserProjects: (adminOnly?: boolean) => string[]
  addProject: (projectName: string) => any
  isUserVisibleProject: (projectName?: string) => boolean
  getUsers: (params?: {
    page?: number
    perPage?: number
    filters?: {
      projects?: string[]
      search?: string
      user_type?: UserType | null
      platform_role?: ProjectRoleBE | null
      is_active?: boolean | null
    }
  }) => Promise<GetUsersResponse>
  getUserById: (userId: string) => Promise<UserListItem>
  updateUser: (userId: string, data: Partial<UserListItem>) => Promise<void>
  addUserProjectAccess: (
    userId: string,
    projectName: string,
    isProjectAdmin: boolean
  ) => Promise<void>
  updateUserProjectAccess: (
    userId: string,
    projectName: string,
    isProjectAdmin: boolean
  ) => Promise<void>
  removeUserProjectAccess: (userId: string, projectName: string) => Promise<void>
  bulkUpdateUsers: (userIds: string[], updates: { role: 'user' | 'admin' }) => Promise<void>
  bulkUpdateUsersProjectRole: (
    userIds: string[],
    projectName: string,
    role: string
  ) => Promise<void>
  bulkAssignToProject: (userIds: string[], projectName: string, role: string) => Promise<void>
  bulkUnassignFromProject: (userIds: string[], projectName: string) => Promise<void>
}

export const userStore = proxy<UserStoreType>({
  isSessionExpired: false,
  isLoadingUser: false,
  user: null,
  userData: null,

  isSSOUser() {
    return !!this.user?.applications?.some((app) => {
      return app === this.user?.username || app === this.user?.name || app === this.user?.userId
    })
  },

  loadUser() {
    userStore.isLoadingUser = true
    return api
      .get('v1/user')
      .then((response) => response.json())
      .then((apiUser: any) => {
        userStore.user = {
          userId: apiUser.user_id,
          email: apiUser.email,
          name: apiUser.name,
          username: apiUser.username,
          isAdmin: apiUser.is_admin,
          isAuthenticated: true,
          user_type: apiUser.user_type,
          applications: apiUser.applications || [],
          applicationsAdmin: apiUser.applications_admin || [],
          projects: apiUser.projects || [],
          picture: apiUser.picture,
        }
      })
      .then(userStore.getUserData)
      .finally(() => {
        userStore.isLoadingUser = false
      })
  },

  getUserData() {
    return api
      .get('v1/user/data')
      .then((res) => res.json())
      .then((data) => {
        userStore.userData = data
      })
  },

  getCurrentUser() {
    return api
      .get('v1/user')
      .then((response) => response.json())
      .then((apiUser: any) => {
        userStore.user = {
          userId: apiUser.user_id,
          email: apiUser.email,
          name: apiUser.name,
          username: apiUser.username,
          isAdmin: apiUser.is_admin,
          isAuthenticated: true,
          user_type: apiUser.user_type,
          applications: apiUser.applications || [],
          applicationsAdmin: apiUser.applications_admin || [],
          projects: apiUser.projects || [],
          picture: apiUser.picture,
        }
        return userStore.user
      })
      .catch(() => {
        toaster.error('Failed to fetch current user')
        return { name: '' }
      })
  },

  loadAssistantsUsers(params = {}) {
    const scope = params.scope || ''
    const queryParams = scope ? `?scope=${scope}` : ''

    return api
      .get(`v1/assistants/users${queryParams}`)
      .then((response) => response.json())
      .then((data) => data.sort((a, b) => a.name.localeCompare(b.name)))
      .catch(() => {
        toaster.error('Failed to fetch Assistant users')
        return []
      })
  },

  loadSkillsUsers() {
    return api
      .get('v1/skills/users')
      .then((response) => response.json())
      .then((data) => data.sort((a, b) => a.name.localeCompare(b.name)))
      .catch(() => {
        toaster.error('Failed to fetch Skill users')
        return []
      })
  },

  getAnalyticsUsers(filters?: AnalyticsQueryParams) {
    return api
      .get('v1/analytics/users', {
        params: filters,
        queryParamArrayHandling: 'compact',
        skipErrorHandling: true,
      })
      .then((response) => response.json())
      .then((data) => {
        const users = data.data.users.sort((a, b) => a.name.localeCompare(b.name))
        return formatUserOptions(users)
      })
  },

  loadWorkflowsUsers() {
    return api
      .get('v1/workflows/users')
      .then((response) => response.json())
      .then((data) => data.sort((a, b) => a.name.localeCompare(b.name)))
      .catch(() => {
        toaster.error('Failed to fetch Workflow users')
        return []
      })
  },

  loadProjectSettingsUsers() {
    return api
      .get('v1/settings/project/users')
      .then((response) => response.json())
      .then((data) => data.sort((a, b) => a.name.localeCompare(b.name)))
      .catch(() => {
        toaster.error('Failed to fetch Project Settings users')
        return []
      })
  },

  async searchUsers(query: string, perPage = 10) {
    const params = new URLSearchParams()
    params.append('search', query)
    params.append('per_page', String(perPage))

    return api
      .get(`v1/admin/users?${params.toString()}`, { skipErrorHandling: true })
      .then((response) => response.json())
      .then((data: GetUsersResponse) => {
        const users = data?.data ?? []
        return users.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      })
      .catch((error) => {
        console.error('Failed to search users:', error)
        throw error
      })
  },

  async assignUserToProject(projectName: string, userId: string, role: string) {
    const isProjectAdmin = role === ProjectRole.ADMINISTRATOR

    return api
      .post(
        `v1/projects/${encodeURIComponent(projectName)}/assignment`,
        {
          user_id: userId,
          is_project_admin: isProjectAdmin,
        },
        { skipErrorHandling: true }
      )
      .then((response) => response.json())
      .catch((error) => {
        console.error('Failed to assign user to project:', error)
        throw error
      })
  },

  async updateUserProjectRole(projectName: string, userId: string, role: string) {
    const isProjectAdmin = role === ProjectRole.ADMINISTRATOR

    return api
      .put(
        `v1/projects/${encodeURIComponent(projectName)}/assignment/${encodeURIComponent(userId)}`,
        {
          is_project_admin: isProjectAdmin,
        },
        { skipErrorHandling: true }
      )
      .then((response) => response.json())
      .catch((error) => {
        console.error('Failed to update user project role:', error)
        throw error
      })
  },

  async unassignUserFromProject(projectName: string, userId: string) {
    return api
      .delete(
        `v1/projects/${encodeURIComponent(projectName)}/assignment/${encodeURIComponent(userId)}`,
        undefined,
        { skipErrorHandling: true }
      )
      .then((response) => response.json())
      .catch((error) => {
        console.error('Failed to unassign user from project:', error)
        throw error
      })
  },

  loadIndexUsers() {
    return api
      .get('v1/index/users')
      .then((response) => response.json())
      .then((data) => data.sort((a, b) => a.name.localeCompare(b.name)))
      .catch(() => {
        toaster.error('Failed to fetch Data Source users')
      })
  },

  async getProjects(query = '', adminOnly = false) {
    if (userStore.user?.isAdmin) {
      return userStore.getAdminProjects(query)
    }

    return userStore.getUserProjects(adminOnly)
  },

  getAdminProjects(search = '') {
    const showAllProjects = import.meta.env.VITE_SHOW_ALL_PROJECTS === 'true'
    const limit = 5
    const limitQuery = showAllProjects ? '' : `limit=${limit}`
    const searchQuery = search ? `search=${search}` : ''
    const queryParams = [searchQuery, limitQuery].filter(Boolean).join('&')
    const userProjects = userStore.getUserProjects()

    if (!showAllProjects && search.length < 3) {
      return Promise.resolve(userProjects)
    }

    return api
      .get(`v1/admin/applications${queryParams ? `?${queryParams}` : ''}`)
      .then((response) => response.json())
      .then((data) => {
        return [...userProjects, ...data.applications.filter((app) => !userProjects.includes(app))]
      })
      .catch((_err) => {
        console.error('Failed to retrieve admin projects')
      })
  },

  getUserProjects(adminOnly = false) {
    const projects = adminOnly ? userStore.user?.applicationsAdmin : userStore.user?.applications
    return projects?.sort((a, b) => a.localeCompare(b)) ?? []
  },

  async getDefaultProject() {
    const projects = await userStore.getProjects()
    if (projects.length) {
      return projects[0]
    }
    return null
  },

  addProject(projectName) {
    return api
      .post('v1/admin/application', { name: projectName })
      .then((response) => response.json())
      .then((data) => {
        toaster.info('Project ' + projectName + ' created successfully!')
        return data
      })
      .catch((_err) => {
        toaster.error('Failed to create project ' + projectName)
      })
  },

  isUserVisibleProject(projectName?: string) {
    return !!userStore.user?.isAdmin || userStore.user?.applications?.includes(projectName)
  },

  getUsers(params = {}) {
    const { page, perPage, filters = {} } = params

    const queryParams = new URLSearchParams()
    // Only add page and perPage if explicitly provided
    if (page !== undefined) {
      queryParams.append('page', String(page))
    }
    if (perPage !== undefined) {
      queryParams.append('per_page', String(perPage))
    }
    if (filters.search) {
      queryParams.append('search', filters.search)
    }

    const filtersJson: Record<string, unknown> = {}
    if (filters.projects?.length) filtersJson.projects = filters.projects
    if (filters.user_type != null) filtersJson.user_type = filters.user_type
    if (filters.platform_role != null) filtersJson.platform_role = filters.platform_role
    if (filters.is_active != null) filtersJson.is_active = filters.is_active
    if (Object.keys(filtersJson).length > 0) {
      queryParams.append('filters', JSON.stringify(filtersJson))
    }

    return api
      .get(`v1/admin/users?${queryParams.toString()}`, { skipErrorHandling: true })
      .then((response) => response.json())
      .then((data: GetUsersResponse) => data)
      .catch((error) => {
        console.error('Failed to fetch users:', error)
        toaster.error('Failed to fetch users')
        throw error
      })
  },

  getUserById(userId) {
    return api
      .get(`v1/admin/users/${userId}`, { skipErrorHandling: true })
      .then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        console.error('Failed to fetch user:', error)
        toaster.error('Failed to fetch user')
        throw error
      })
  },

  updateUser(userId, data) {
    return api
      .put(`v1/admin/users/${userId}`, data, { skipErrorHandling: true })
      .then((response) => response.json())
      .then(() => {
        toaster.info('User updated successfully')
      })
      .catch((error) => {
        console.error('Failed to update user:', error)
        toaster.error('Failed to update user')
        throw error
      })
  },

  addUserProjectAccess(userId, projectName, isProjectAdmin) {
    return api
      .post(
        `v1/admin/users/${userId}/projects`,
        { project_name: projectName, is_project_admin: isProjectAdmin },
        { skipErrorHandling: true }
      )
      .then((response) => response.json())
      .then(() => {
        toaster.info('Project access added successfully')
      })
      .catch((error) => {
        toaster.error('Failed to add project access')
        throw error
      })
  },

  updateUserProjectAccess(userId, projectName, isProjectAdmin) {
    return api
      .put(
        `v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}`,
        { is_project_admin: isProjectAdmin },
        { skipErrorHandling: true }
      )
      .then((response) => response.json())
      .then(() => {
        toaster.info('Project access updated successfully')
      })
      .catch((error) => {
        toaster.error('Failed to update project access')
        throw error
      })
  },

  removeUserProjectAccess(userId, projectName) {
    return api
      .delete(`v1/admin/users/${userId}/projects/${encodeURIComponent(projectName)}`, undefined, {
        skipErrorHandling: true,
      })
      .then((response) => response.json())
      .then(() => {
        toaster.info('Project access removed successfully')
      })
      .catch((error) => {
        toaster.error('Failed to remove project access')
        throw error
      })
  },

  async bulkUpdateUsers(userIds, updates) {
    const isAdmin = updates.role === 'admin'

    try {
      const response = await api.post(
        'v1/users/bulk/update',
        { userIds, isAdmin },
        { skipErrorHandling: true }
      )
      await response.json()
      toaster.info(`Updated ${userIds.length} user(s) successfully`)
    } catch (error) {
      toaster.error('Failed to update users')
      throw error
    }
  },

  async bulkUpdateUsersProjectRole(userIds, projectName, role) {
    const isProjectAdmin = role === ProjectRole.ADMINISTRATOR

    try {
      const users = userIds.map((userId) => ({
        user_id: userId,
        is_project_admin: isProjectAdmin,
      }))

      const response = await api.post(
        `v1/projects/${encodeURIComponent(projectName)}/assignments`,
        { users },
        { skipErrorHandling: true }
      )
      await response.json()
      toaster.info(`Updated role for ${userIds.length} user(s) successfully`)
    } catch (error) {
      toaster.error('Failed to update user roles')
      throw error
    }
  },

  async bulkAssignToProject(userIds, projectName, role) {
    const isProjectAdmin = role === ProjectRole.ADMINISTRATOR

    try {
      const users = userIds.map((userId) => ({
        user_id: userId,
        is_project_admin: isProjectAdmin,
      }))

      const response = await api.post(
        `v1/projects/${encodeURIComponent(projectName)}/assignments`,
        { users },
        { skipErrorHandling: true }
      )
      await response.json()
      toaster.info(`Assigned ${userIds.length} user(s) to project successfully`)
    } catch (error) {
      toaster.error('Failed to assign users to project')
      throw error
    }
  },

  async bulkUnassignFromProject(userIds, projectName) {
    const queryParams = userIds.map((id) => `user_id=${encodeURIComponent(id)}`).join('&')
    const response = await api.delete(
      `v1/projects/${encodeURIComponent(projectName)}/assignments?${queryParams}`,
      undefined
    )
    await response.json()
    toaster.info(`Unassigned ${userIds.length} user(s) from project successfully`)
  },
})
