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
 * MCP Store
 * State management for MCP (Model Context Protocol) server configurations
 */

import { proxy } from 'valtio'

import { MCP_DEFAULT_PAGE, MCP_DEFAULT_PER_PAGE, MCP_DEFAULT_FILTERS } from '@/constants/mcp'
import { Pagination } from '@/types/common'
import { MCPConfig, MCPConfigRequest, MCPFilters } from '@/types/entity/mcp'
import api from '@/utils/api'

interface MCPStore {
  /** List of MCP server configurations */
  configs: MCPConfig[]
  /** Pagination information */
  pagination: Pagination
  /** Loading state for async operations */
  loading: boolean
  /** Error message if any operation fails */
  error: string | null
  /** Current filter settings */
  filters: MCPFilters
  /** Fetch list of MCP configurations */
  indexConfigs: (filters?: MCPFilters, page?: number, perPage?: number) => Promise<MCPConfig[]>
  /** Fetch single MCP configuration by ID */
  getConfig: (id: string) => Promise<MCPConfig>
  /** Create new MCP configuration */
  createConfig: (data: MCPConfigRequest) => Promise<MCPConfig>
  /** Update existing MCP configuration */
  updateConfig: (id: string, data: Partial<MCPConfigRequest>) => Promise<MCPConfig>
  /** Delete MCP configuration */
  deleteConfig: (id: string) => Promise<void>
  /** Update current filters */
  setFilters: (filters: MCPFilters) => void
  /** Reset filters to default values */
  resetFilters: () => void
}

export const mcpStore = proxy<MCPStore>({
  configs: [],
  pagination: {
    page: MCP_DEFAULT_PAGE,
    perPage: MCP_DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  loading: false,
  error: null,
  filters: MCP_DEFAULT_FILTERS,

  /**
   * Fetches MCP server configurations with optional filtering and pagination
   *
   * @param filters - Optional filters (category, search, is_public, active_only)
   * @param page - Page number (0-indexed), defaults to MCP_DEFAULT_PAGE
   * @param perPage - Number of items per page (max 100), defaults to MCP_DEFAULT_PER_PAGE
   * @returns Promise resolving to array of MCP configurations
   * @throws Error if API request fails
   *
   * @example
   * ```typescript
   * // Fetch first page with default settings
   * await mcpStore.indexConfigs()
   *
   * // Fetch with filters
   * await mcpStore.indexConfigs({ category: 'AI', search: 'github', is_public: true }, 0, 20)
   * ```
   */
  async indexConfigs(filters = {}, page = MCP_DEFAULT_PAGE, perPage = MCP_DEFAULT_PER_PAGE) {
    this.loading = true
    this.error = null

    try {
      const params = {
        page,
        per_page: perPage,
        ...this.filters,
        ...filters,
      }

      console.log('[MCP Store] Fetching configs with params:', params)

      // Build query string using URLSearchParams
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, String(value))
        }
      })
      const queryString = queryParams.toString()
      const url = queryString ? `v1/mcp-configs?${queryString}` : 'v1/mcp-configs'

      const response = await api.get(url)
      const data = await response.json()

      console.log('[MCP Store] Received response:', data)

      this.configs = data.configs ?? []
      this.pagination = {
        page: data.page ?? 0,
        perPage: data.per_page ?? 20,
        totalPages: Math.ceil((data.total ?? 0) / (data.per_page ?? 20)),
        totalCount: data.total ?? 0,
      }

      return data.configs ?? []
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to fetch MCP configurations: ${contextualError}`
      console.error('MCP Store Error (indexConfigs):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  /**
   * Fetches a single MCP configuration by ID
   * Note: Reserved for future use when individual config details are needed
   *
   * @param id - The unique identifier of the MCP configuration
   * @returns Promise resolving to the MCP configuration
   * @throws Error if configuration not found or API request fails
   */
  async getConfig(id: string) {
    this.loading = true
    this.error = null

    try {
      const response = await api.get(`v1/mcp-configs/${id}`)
      return await response.json()
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to fetch MCP configuration: ${contextualError}`
      console.error('MCP Store Error (getConfig):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  /**
   * Creates a new MCP server configuration
   *
   * @param data - Configuration data for the new MCP server
   * @returns Promise resolving to the created MCP configuration
   * @throws Error if validation fails or API request fails
   *
   * @example
   * ```typescript
   * const newConfig = await mcpStore.createConfig({
   *   name: 'GitHub MCP',
   *   description: 'Access GitHub repositories',
   *   config: { command: 'npx', args: ['@modelcontextprotocol/server-github'] },
   *   is_public: true
   * })
   * ```
   */
  async createConfig(data: MCPConfigRequest) {
    this.loading = true
    this.error = null

    try {
      const response = await api.post('v1/mcp-configs', data)
      const result = await response.json()

      // Add to the beginning of the list
      this.configs.unshift(result)
      this.pagination.totalCount += 1

      return result
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to create MCP configuration: ${contextualError}`
      console.error('MCP Store Error (createConfig):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  /**
   * Updates an existing MCP configuration
   *
   * @param id - The unique identifier of the configuration to update
   * @param data - Partial configuration data to update
   * @returns Promise resolving to the updated MCP configuration
   * @throws Error if configuration not found or API request fails
   *
   * @example
   * ```typescript
   * const updated = await mcpStore.updateConfig('config-123', {
   *   name: 'Updated Name',
   *   is_active: false
   * })
   * ```
   */
  async updateConfig(id: string, data: Partial<MCPConfigRequest>) {
    this.loading = true
    this.error = null

    try {
      const response = await api.put(`v1/mcp-configs/${id}`, data)
      const result = await response.json()

      // Update in the list
      const index = this.configs.findIndex((config) => config.id === id)
      if (index !== -1) {
        this.configs[index] = result
      }

      return result
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to update MCP configuration: ${contextualError}`
      console.error('MCP Store Error (updateConfig):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  /**
   * Deletes an MCP configuration
   *
   * @param id - The unique identifier of the configuration to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if configuration not found or API request fails
   *
   * @example
   * ```typescript
   * await mcpStore.deleteConfig('config-123')
   * ```
   */
  async deleteConfig(id: string) {
    this.loading = true
    this.error = null

    try {
      await api.delete(`v1/mcp-configs/${id}`)

      // Remove from the list
      this.configs = this.configs.filter((config) => config.id !== id)
      this.pagination.totalCount -= 1
    } catch (error: any) {
      const contextualError = error.response?.data?.message ?? error.message
      this.error = `Failed to delete MCP configuration: ${contextualError}`
      console.error('MCP Store Error (deleteConfig):', error)
      throw error
    } finally {
      this.loading = false
    }
  },

  /**
   * Updates the current filter settings
   * Merges new filters with existing ones
   *
   * @param filters - Filter settings to apply
   *
   * @example
   * ```typescript
   * mcpStore.setFilters({ category: 'AI', active_only: true })
   * ```
   */
  setFilters(filters: MCPFilters) {
    this.filters = { ...this.filters, ...filters }
  },

  /**
   * Resets all filters to their default values
   * Note: Reserved for future filter reset functionality
   */
  resetFilters() {
    this.filters = MCP_DEFAULT_FILTERS
  },
})
