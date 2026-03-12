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

import { ENV } from '@/constants'
import type { AnalyticsQueryParams } from '@/types/analytics'
import { User, UserData } from '@/types/entity/user'
import api from '@/utils/api'
import toaster from '@/utils/toaster'
import { formatUserOptions } from '@/utils/user'
import { getMode } from '@/utils/utils'

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
  logOutUser: () => void
  getUserData: () => Promise<void>
  loadIndexUsers: () => Promise<User[]>
  loadAssistantsUsers: (params?: { scope?: string }) => Promise<User[]>
  loadSkillsUsers: () => Promise<User[]>
  getAnalyticsUsers: (
    filters?: AnalyticsQueryParams
  ) => Promise<Array<{ label: string; value: string }>>
  loadWorkflowsUsers: () => Promise<User[]>
  loadProjectSettingsUsers: () => Promise<User[]>
  getProjects: (query?: string, adminOnly?: boolean) => Promise<string[]>
  getDefaultProject: () => Promise<string | null>
  getAdminProjects: (search?: string) => Promise<string[]>
  getUserProjects: (adminOnly?: boolean) => string[]
  addProject: (projectName: string) => any
  isUserVisibleProject: (projectName?: string) => boolean
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

  logOutUser() {
    if (getMode() === ENV.LOCAL) {
      return
    }

    document.location.href = `${api.BASE_URL}/v1/user/log_out`
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
          isAdmin: apiUser.is_super_admin || apiUser.is_admin,
          isAuthenticated: true,
          userType: apiUser.user_type,
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
})
