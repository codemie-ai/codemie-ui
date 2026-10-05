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

import { PRODUCTS_PER_PAGE } from '@/constants/shoppingCart'
import { Product, ProductsResponse } from '@/types/entity/product'
import api from '@/utils/api'

interface ProductsPagination {
  page: number
  perPage: number
  total: number
}

interface ProductsStoreType {
  items: Product[]
  pagination: ProductsPagination
  loading: boolean
  error: string | null
  fetchProducts: (page?: number) => Promise<void>
  fetchProductById: (id: string) => Promise<Product>
}

const DEFAULT_PAGE = 0

export const productsStore = proxy<ProductsStoreType>({
  items: [],
  pagination: {
    page: DEFAULT_PAGE,
    perPage: PRODUCTS_PER_PAGE,
    total: 0,
  },
  loading: false,
  error: null,

  async fetchProducts(page = DEFAULT_PAGE) {
    this.loading = true
    this.error = null
    try {
      const params = { page, per_page: this.pagination.perPage }
      const response = await api.get('v1/products', { params })
      const data: ProductsResponse = await response.json()
      this.items = data.items ?? data
      this.pagination.total = data.total ?? 0
      this.pagination.page = page
    } catch (err: any) {
      this.error = err.message ?? 'Failed to load products'
      console.error('Store Error (fetchProducts):', err)
    } finally {
      this.loading = false
    }
  },

  async fetchProductById(id) {
    const response = await api.get(`v1/products/${id}`)
    return (await response.json()) as Product
  },
})
