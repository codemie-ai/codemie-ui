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

import { WORK_ITEMS_PER_PAGE } from '@/constants/workItems'
import {
  WorkItem,
  WorkItemFilters,
  CreateWorkItemDto,
  UpdateWorkItemDto,
} from '@/types/entity/workItem'
import api from '@/utils/api'

interface WorkItemsPagination {
  page: number
  perPage: number
  totalPages: number
  totalCount: number
}

interface WorkItemsStoreType {
  items: WorkItem[]
  currentItem: WorkItem | null
  pagination: WorkItemsPagination
  loading: boolean
  error: string | null
  filters: WorkItemFilters

  fetchItems: (filters?: WorkItemFilters, page?: number, perPage?: number) => Promise<void>
  fetchItemById: (id: string) => Promise<void>
  createItem: (data: CreateWorkItemDto) => Promise<WorkItem>
  updateItem: (id: string, data: UpdateWorkItemDto) => Promise<WorkItem>
  deleteItem: (id: string) => Promise<void>
  setFilters: (filters: WorkItemFilters) => void
  clearFilters: () => void
}

const DEFAULT_PAGE = 0

export const workItemsStore = proxy<WorkItemsStoreType>({
  items: [],
  currentItem: null,
  pagination: {
    page: DEFAULT_PAGE,
    perPage: WORK_ITEMS_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,
  filters: {},

  async fetchItems(filters = {}, page = DEFAULT_PAGE, perPage = WORK_ITEMS_PER_PAGE) {
    this.loading = true
    this.error = null
    try {
      const params = { ...filters, page, per_page: perPage }
      const response = await api.get('v1/work-items', { params })
      const data = await response.json()
      this.items = data.items ?? data
      if (data.pagination) {
        this.pagination = data.pagination
      }
    } catch (err: any) {
      this.error = err.message ?? 'Failed to load work items'
      console.error('Store Error (fetchItems):', err)
    } finally {
      this.loading = false
    }
  },

  async fetchItemById(id) {
    this.loading = true
    this.error = null
    try {
      const response = await api.get(`v1/work-items/${id}`)
      this.currentItem = await response.json()
    } catch (err: any) {
      this.error = err.message ?? 'Failed to load work item'
      console.error('Store Error (fetchItemById):', err)
    } finally {
      this.loading = false
    }
  },

  async createItem(data) {
    this.loading = true
    this.error = null
    try {
      const response = await api.post('v1/work-items', data)
      const result: WorkItem = await response.json()
      this.items.unshift(result)
      return result
    } catch (err: any) {
      this.error = err.message ?? 'Failed to create work item'
      console.error('Store Error (createItem):', err)
      throw err
    } finally {
      this.loading = false
    }
  },

  async updateItem(id, data) {
    this.loading = true
    this.error = null
    try {
      const response = await api.put(`v1/work-items/${id}`, data)
      const result: WorkItem = await response.json()
      const idx = this.items.findIndex((item) => item.id === id)
      if (idx !== -1) {
        this.items[idx] = result
      }
      if (this.currentItem?.id === id) {
        this.currentItem = result
      }
      return result
    } catch (err: any) {
      this.error = err.message ?? 'Failed to update work item'
      console.error('Store Error (updateItem):', err)
      throw err
    } finally {
      this.loading = false
    }
  },

  async deleteItem(id) {
    this.loading = true
    this.error = null
    try {
      await api.delete(`v1/work-items/${id}`)
      this.items = this.items.filter((item) => item.id !== id)
    } catch (err: any) {
      this.error = err.message ?? 'Failed to delete work item'
      console.error('Store Error (deleteItem):', err)
      throw err
    } finally {
      this.loading = false
    }
  },

  setFilters(filters) {
    this.filters = { ...this.filters, ...filters }
  },

  clearFilters() {
    this.filters = {}
  },
})
