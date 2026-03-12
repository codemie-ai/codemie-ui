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

/**
 * Providers Store
 * State management for service providers
 */

import { proxy } from 'valtio'

import { Provider } from '@/types/entity/provider'
import api from '@/utils/api'

/**
 * Providers Store interface defining all state and actions
 */
interface ProvidersStore {
  providers: Provider[]
  loading: boolean
  error: string | null
  indexProviders: () => Promise<Provider[]>
  getProvider: (id: string) => Promise<Provider>
  createProvider: (data: any) => Promise<Provider>
  updateProvider: (id: string, data: any) => Promise<Provider>
  deleteProvider: (id: string) => Promise<void>
}

/**
 * Providers Store instance
 * Central state management for service providers
 */
export const providersStore = proxy<ProvidersStore>({
  providers: [],
  loading: false,
  error: null,

  /**
   * Fetches all service providers
   *
   * @returns Promise resolving to array of providers
   * @throws Error if the fetch operation fails
   */
  async indexProviders() {
    this.loading = true
    const response = await api.get('v1/providers')
    const data = await response.json()
    this.providers = data
    this.loading = false
    return data
  },

  /**
   * Fetches a single provider by ID
   *
   * @param id - Provider ID
   * @returns Promise resolving to provider details
   * @throws Error if the fetch operation fails
   */
  async getProvider(id: string) {
    this.loading = true
    const response = await api.get(`v1/providers/${id}`)
    const data = await response.json()
    this.loading = false
    return data
  },

  async createProvider(data: any) {
    this.loading = true
    try {
      const response = await api.post('v1/providers', data)
      const result = await response.json()
      this.providers.unshift(result)
      return result
    } finally {
      this.loading = false
    }
  },

  async updateProvider(id: string, data: any) {
    this.loading = true
    try {
      const response = await api.put(`v1/providers/${id}`, data)
      const result = await response.json()
      const index = this.providers.findIndex((item) => item.id === id)
      if (index !== -1) {
        this.providers[index] = result
      }
      return result
    } finally {
      this.loading = false
    }
  },

  async deleteProvider(id: string) {
    this.loading = true
    await api.delete(`v1/providers/${id}`)
    this.providers = this.providers.filter((item) => item.id !== id)
    this.loading = false
  },
})
