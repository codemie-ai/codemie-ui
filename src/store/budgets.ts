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
import {
  Budget,
  BudgetCategory,
  BudgetListResponse,
  BudgetPayload,
  BudgetSyncResult,
} from '@/types/entity/budget'
import { FilterOption } from '@/types/filters'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

interface BudgetsStore {
  budgets: Budget[]
  selectedBudget: Budget | null
  pagination: Pagination
  loading: boolean
  syncing: boolean
  error: string | null
  optionsByCategory: Partial<Record<BudgetCategory, FilterOption[]>>
  listBudgets: (params?: {
    page?: number
    perPage?: number
    category?: BudgetCategory | null
  }) => Promise<Budget[]>
  getBudget: (budgetId: string) => Promise<Budget>
  createBudget: (payload: BudgetPayload) => Promise<Budget>
  updateBudget: (budgetId: string, payload: Partial<BudgetPayload>) => Promise<Budget>
  deleteBudget: (budgetId: string) => Promise<void>
  syncBudgets: () => Promise<BudgetSyncResult>
  getBudgetOptions: (category: BudgetCategory, force?: boolean) => Promise<FilterOption[]>
  fetchAllBudgetOptions: (search?: string) => Promise<Array<{ label: string; value: string }>>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10
const OPTIONS_PER_PAGE = 100

export const budgetsStore = proxy<BudgetsStore>({
  budgets: [],
  selectedBudget: null,
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  syncing: false,
  error: null,
  optionsByCategory: {},

  async listBudgets({ page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE, category = null } = {}) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get('v1/admin/budgets', {
        params: {
          page,
          per_page: perPage,
          category,
        },
        skipErrorHandling: true,
      })
      const data = (await response.json()) as BudgetListResponse

      this.budgets = data.data || []
      this.pagination = {
        page: data.pagination?.page ?? page,
        perPage: data.pagination?.per_page ?? perPage,
        totalPages: Math.ceil(
          (data.pagination?.total ?? 0) / (data.pagination?.per_page ?? perPage)
        ),
        totalCount: data.pagination?.total ?? 0,
      }

      return this.budgets
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load budgets'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async getBudget(budgetId: string) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(`v1/admin/budgets/${encodeURIComponent(budgetId)}`, {
        skipErrorHandling: true,
      })
      const budget = (await response.json()) as Budget
      this.selectedBudget = budget
      return budget
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to load budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async createBudget(payload: BudgetPayload) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('v1/admin/budgets', payload, { skipErrorHandling: true })
      const budget = (await response.json()) as Budget
      this.optionsByCategory = {}
      return budget
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to create budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async updateBudget(budgetId: string, payload: Partial<BudgetPayload>) {
    this.loading = true
    this.error = null

    try {
      const response = await api.patch(
        `v1/admin/budgets/${encodeURIComponent(budgetId)}`,
        payload,
        { skipErrorHandling: true }
      )
      const budget = (await response.json()) as Budget
      this.optionsByCategory = {}
      return budget
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to update budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async deleteBudget(budgetId: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/admin/budgets/${encodeURIComponent(budgetId)}`, undefined, {
        skipErrorHandling: true,
      })
      this.optionsByCategory = {}
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to delete budget'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.loading = false
    }
  },

  async syncBudgets() {
    this.syncing = true
    this.error = null

    try {
      const response = await api.post('v1/admin/budgets/sync', undefined, {
        skipErrorHandling: true,
      })
      const result = (await response.json()) as BudgetSyncResult
      this.optionsByCategory = {}
      return result
    } catch (error: any) {
      const msg = error?.parsedError?.message ?? error?.message ?? 'Failed to sync budgets'
      this.error = msg
      toaster.error(msg)
      throw error
    } finally {
      this.syncing = false
    }
  },

  async fetchAllBudgetOptions(search = '') {
    const response = await api.get('v1/admin/budgets', {
      params: { page: 0, per_page: OPTIONS_PER_PAGE, ...(search ? { search } : {}) },
      skipErrorHandling: true,
    })
    const data = (await response.json()) as BudgetListResponse
    return (data.data || []).map((budget) => ({
      label: budget.name || budget.budget_id,
      value: budget.budget_id,
    }))
  },

  async getBudgetOptions(category: BudgetCategory, force = false) {
    if (!force && this.optionsByCategory[category]) {
      return this.optionsByCategory[category] || []
    }

    const response = await api.get('v1/admin/budgets', {
      params: {
        page: 0,
        per_page: OPTIONS_PER_PAGE,
        category,
      },
      skipErrorHandling: true,
    })
    const data = (await response.json()) as BudgetListResponse
    const options = (data.data || []).map((budget) => ({
      label: budget.name || budget.budget_id,
      value: budget.budget_id,
    }))
    this.optionsByCategory[category] = options
    return options
  },
})
