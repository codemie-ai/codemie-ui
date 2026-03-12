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
import { Category, CategoryRequest } from '@/types/entity/category'
import api from '@/utils/api'

interface CategoriesStore {
  categories: Category[]
  selectedCategory: Category | null
  pagination: Pagination
  loading: boolean
  error: string | null
  indexCategories: (page?: number, perPage?: number) => Promise<Category[]>
  getCategory: (id: string) => Promise<Category>
  createCategory: (data: CategoryRequest) => Promise<Category>
  updateCategory: (id: string, data: CategoryRequest) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

export const categoriesStore = proxy<CategoriesStore>({
  categories: [],
  selectedCategory: null,
  pagination: {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,

  async indexCategories(page = DEFAULT_PAGE, perPage = DEFAULT_PER_PAGE) {
    this.loading = true
    this.error = null

    try {
      const params = {
        page,
        per_page: perPage,
      }

      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
      const queryString = queryParams.toString()
      const url = queryString
        ? `v1/assistants/categories/list?${queryString}`
        : 'v1/assistants/categories/list'

      const response = await api.get(url)
      const data = await response.json()

      if (Array.isArray(data)) {
        this.categories = data
        this.pagination = {
          page,
          perPage,
          totalPages: Math.ceil(data.length / perPage),
          totalCount: data.length,
        }
        return data
      }

      this.categories = data.categories ?? []
      this.pagination = {
        page: data.page ?? 0,
        perPage: data.per_page ?? 10,
        totalPages: Math.ceil((data.total ?? 0) / (data.per_page ?? 10)),
        totalCount: data.total ?? 0,
      }
      return data.categories ?? []
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to load categories: ${contextualError}`
      console.error('Categories Store Error (indexCategories):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async getCategory(id: string) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(`v1/assistants/categories/${id}`)
      const data = await response.json()
      this.selectedCategory = data
      return data
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to load category: ${contextualError}`
      console.error('Categories Store Error (getCategory):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async createCategory(data: CategoryRequest) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('v1/assistants/categories', data)
      const result = await response.json()

      this.categories.unshift(result)
      this.pagination.totalCount += 1

      return result
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to create category: ${contextualError}`
      console.error('Categories Store Error (createCategory):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async updateCategory(id: string, data: CategoryRequest) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(`v1/assistants/categories/${id}`, data)
      const result = await response.json()

      const index = this.categories.findIndex((cat) => cat.id === id)
      if (index !== -1) {
        this.categories[index] = result
      }

      return result
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to update category: ${contextualError}`
      console.error('Categories Store Error (updateCategory):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  async deleteCategory(id: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/assistants/categories/${id}`)

      this.categories = this.categories.filter((cat) => cat.id !== id)
      this.pagination.totalCount -= 1
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to delete category: ${contextualError}`
      console.error('Categories Store Error (deleteCategory):', error)
      throw error
    } finally {
      this.loading = false
    }
  },
})
