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
import { BudgetCategory } from '@/types/entity/budget'
import {
  MemberAllocationOverridePayload,
  ProjectBudget,
  ProjectBudgetCreatePayload,
  ProjectBudgetListResponse,
  ProjectBudgetMemberAllocation,
  ProjectBudgetUpdatePayload,
} from '@/types/entity/projectBudget'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface ProjectBudgetsStore {
  projectBudgets: ProjectBudget[]
  pagination: Pagination
  loading: boolean
  error: string | null
  listProjectBudgets: (params?: {
    projectName?: string
    category?: BudgetCategory | null
    page?: number
    perPage?: number
  }) => Promise<ProjectBudget[]>
  createProjectBudget: (payload: ProjectBudgetCreatePayload) => Promise<ProjectBudget>
  updateProjectBudget: (
    budgetId: string,
    payload: ProjectBudgetUpdatePayload
  ) => Promise<ProjectBudget>
  deleteProjectBudget: (budgetId: string) => Promise<void>
  resetProjectBudget: (budgetId: string) => Promise<void>
  rebalanceProjectBudget: (budgetId: string) => Promise<void>
  overrideMemberAllocation: (
    budgetId: string,
    userId: string,
    payload: MemberAllocationOverridePayload
  ) => Promise<ProjectBudgetMemberAllocation>
  clearMemberOverride: (budgetId: string, userId: string) => Promise<void>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

export const projectBudgetsStore = proxy<ProjectBudgetsStore>({
  projectBudgets: [],
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,

  async listProjectBudgets({
    projectName,
    category = null,
    page = DEFAULT_PAGE,
    perPage = DEFAULT_PER_PAGE,
  } = {}) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get('v1/admin/project-budgets', {
        params: {
          page,
          per_page: perPage,
          ...(projectName ? { project_name: projectName } : {}),
          ...(category ? { category } : {}),
        },
        skipErrorHandling: true,
      })
      const data = (await response.json()) as ProjectBudgetListResponse

      this.projectBudgets = data.items || []
      this.pagination = {
        page: data.page ?? page,
        perPage: data.per_page ?? perPage,
        totalPages: Math.ceil((data.total ?? 0) / (data.per_page ?? perPage)),
        totalCount: data.total ?? 0,
      }

      return this.projectBudgets
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load project budgets'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async createProjectBudget(payload: ProjectBudgetCreatePayload) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('v1/admin/project-budgets', payload, {
        skipErrorHandling: true,
      })
      const budget = (await response.json()) as ProjectBudget
      return budget
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to create project budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async updateProjectBudget(budgetId: string, payload: ProjectBudgetUpdatePayload) {
    this.loading = true
    this.error = null

    try {
      const response = await api.patch(`v1/admin/project-budgets/${budgetId}`, payload, {
        skipErrorHandling: true,
      })
      const budget = (await response.json()) as ProjectBudget
      return budget
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to update project budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async deleteProjectBudget(budgetId: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/admin/project-budgets/${budgetId}`, {
        skipErrorHandling: true,
      })
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to delete project budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async resetProjectBudget(budgetId: string) {
    this.loading = true
    this.error = null

    try {
      await api.post(`v1/admin/project-budgets/${budgetId}/reset`, undefined, {
        skipErrorHandling: true,
      })
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to reset project budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async rebalanceProjectBudget(budgetId: string) {
    this.loading = true
    this.error = null

    try {
      await api.post(
        `v1/admin/project-budgets/${budgetId}/rebalance`,
        {},
        {
          skipErrorHandling: true,
        }
      )
    } catch (error: any) {
      const msg =
        error?.parsedError?.message ?? error?.message ?? 'Failed to rebalance project budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async overrideMemberAllocation(
    budgetId: string,
    userId: string,
    payload: MemberAllocationOverridePayload
  ) {
    this.loading = true
    this.error = null

    try {
      const response = await api.patch(
        `v1/admin/project-budgets/${budgetId}/members/${userId}`,
        payload,
        { skipErrorHandling: true }
      )
      return (await response.json()) as ProjectBudgetMemberAllocation
    } catch (error: any) {
      const msg =
        error?.parsedError?.message ?? error?.message ?? 'Failed to override member allocation'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async clearMemberOverride(budgetId: string, userId: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/admin/project-budgets/${budgetId}/members/${userId}/override`, {
        skipErrorHandling: true,
      })
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to clear member override'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },
})
