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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mcpStore } from '@/store/mcp'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('mcpStore.indexConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    mcpStore.configs = []
    mcpStore.loading = false
    mcpStore.error = null
    mcpStore.clearCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should cache configs while showing only search results', async () => {
    // Step 1: Simulate existing catalog entry fetched via getConfig()
    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        id: 'existing-1',
        name: 'Existing Server',
        description: 'Already added to assistant',
        categories: ['Development'],
        config: { command: 'npx', args: ['existing-server'] },
        required_env_vars: [],
        user_id: 'user-1',
        project: 'project-1',
        is_public: true,
        is_system: false,
        usage_count: 5,
        is_active: true,
      }),
    })
    await mcpStore.getConfig('existing-1')

    // Step 2: Mock search API response with different configs
    const searchResults = [
      {
        id: 'search-1',
        name: 'Search Result 1',
        description: 'Found via search',
        categories: ['AI'],
        config: { command: 'npx', args: ['search-server-1'] },
        required_env_vars: [],
        user_id: 'user-2',
        project: 'project-1',
        is_public: true,
        is_system: false,
        usage_count: 10,
        is_active: true,
      },
      {
        id: 'search-2',
        name: 'Search Result 2',
        description: 'Also found via search',
        categories: ['API'],
        config: { command: 'npx', args: ['search-server-2'] },
        required_env_vars: [],
        user_id: 'user-3',
        project: 'project-1',
        is_public: true,
        is_system: false,
        usage_count: 3,
        is_active: true,
      },
    ]

    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        configs: searchResults,
        page: 0,
        per_page: 20,
        total: 2,
      }),
    })

    // Step 3: Call indexConfigs (simulating marketplace search)
    await mcpStore.indexConfigs({ search: 'test' })

    // Step 4: Assert configs shows only search results (not existing-1)
    expect(mcpStore.configs).toHaveLength(2)
    expect(mcpStore.configs.find((c) => c.id === 'search-1')).toBeDefined()
    expect(mcpStore.configs.find((c) => c.id === 'search-2')).toBeDefined()
    expect(mcpStore.configs.find((c) => c.id === 'existing-1')).toBeUndefined()

    // Step 5: Assert existing config is still in cache
    expect(mcpStore.getCachedConfig('existing-1')).toBeDefined()
    expect(mcpStore.getCachedConfig('existing-1')?.name).toBe('Existing Server')
  })

  it('should update existing config when re-fetched with same ID', async () => {
    // Step 1: Set up existing config
    const oldVersion = {
      id: 'config-1',
      name: 'Old Name',
      description: 'Old description',
      categories: ['Development'],
      config: { command: 'npx', args: ['old-args'] },
      required_env_vars: [],
      user_id: 'user-1',
      project: 'project-1',
      is_public: true,
      is_system: false,
      usage_count: 5,
      is_active: true,
    }
    mcpStore.configs = [oldVersion]

    // Step 2: Mock API with updated version
    const updatedVersion = {
      id: 'config-1',
      name: 'New Name',
      description: 'Updated description',
      categories: ['AI'],
      config: { command: 'npx', args: ['new-args'] },
      required_env_vars: [],
      user_id: 'user-1',
      project: 'project-1',
      is_public: true,
      is_system: false,
      usage_count: 10,
      is_active: true,
    }

    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        configs: [updatedVersion],
        page: 0,
        per_page: 20,
        total: 1,
      }),
    })

    // Step 3: Fetch again
    await mcpStore.indexConfigs()

    // Step 4: Assert updated version replaced old one
    expect(mcpStore.configs).toHaveLength(1)
    expect(mcpStore.configs[0].name).toBe('New Name')
    expect(mcpStore.configs[0].description).toBe('Updated description')
  })
})

describe('mcpStore.cloneConfigFromForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mcpStore.configs = []
    mcpStore.loading = false
    mcpStore.error = null
    mcpStore.pagination = {
      page: 0,
      perPage: 20,
      totalPages: 0,
      totalCount: 0,
    }
    mcpStore.clearCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const cloneResponseFixture = {
    id: 'cloned-1',
    name: 'Cloned Server (Copy)',
    description: 'Cloned description',
    categories: ['Development'],
    config: { command: 'npx', args: ['cloned-server'] },
    required_env_vars: [],
    user_id: 'user-1',
    project: 'project-1',
    is_public: true,
    is_system: false,
    usage_count: 0,
    is_active: true,
  }

  const formData = {
    name: 'Copy 1 of Server',
    description: 'Cloned description',
    config: { command: 'npx', args: ['cloned-server'] },
  }

  it('should POST data to the clone endpoint and unshift the result into configs', async () => {
    mockApiPost.mockResolvedValueOnce({ json: async () => cloneResponseFixture })
    const result = await mcpStore.cloneConfigFromForm('source-1', formData)
    expect(result).toEqual(cloneResponseFixture)
    expect(mcpStore.configs[0]).toEqual(cloneResponseFixture)
    expect(mcpStore.pagination.totalCount).toBe(1)
    expect(mockApiPost).toHaveBeenCalledWith('v1/mcp-configs/source-1/clone', formData)
  })

  it('should set error and rethrow when clone request rejects', async () => {
    mockApiPost.mockRejectedValueOnce({
      response: { data: { message: 'some message' } },
    })

    await expect(mcpStore.cloneConfigFromForm('source-3', formData)).rejects.toBeTruthy()
    expect(mcpStore.error).toContain('some message')
  })
})

describe('mcpStore.testConfig', () => {
  const baseConfig = {
    id: 'cfg-1',
    name: 'Server',
    categories: [],
    required_env_vars: [],
    user_id: 'u',
    project: 'p',
    is_public: true,
    is_system: false,
    usage_count: 0,
    is_active: true,
  }
  const tested = {
    status: 'success',
    message: 'ok',
    error_category: null,
    tools_count: 3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mcpStore.configs = [{ ...baseConfig } as any]
    mcpStore.clearCache()
    mcpStore.testingConfigIds = []
  })

  it('posts settings_id when an integration is chosen', async () => {
    mockApiPost.mockResolvedValueOnce({ json: async () => tested })

    await mcpStore.testConfig('cfg-1', 'settings-9')

    expect(mockApiPost).toHaveBeenCalledWith(
      'v1/mcp-configs/cfg-1/test',
      { settings_id: 'settings-9' },
      { skipErrorHandling: true }
    )
  })

  it('posts to the test endpoint and returns the parsed result without mutating configs or cache', async () => {
    mockApiPost.mockResolvedValueOnce({ json: async () => tested })

    const result = await mcpStore.testConfig('cfg-1')

    expect(mockApiPost).toHaveBeenCalledWith('v1/mcp-configs/cfg-1/test', undefined, {
      skipErrorHandling: true,
    })
    expect(result).toEqual(tested)
    expect(mcpStore.configs[0]).toEqual(baseConfig)
    expect(mcpStore.getCachedConfig('cfg-1')).toBeUndefined()
    expect(mcpStore.testingConfigIds).not.toContain('cfg-1')
  })

  it('issues only one request for concurrent calls with the same id', async () => {
    let resolve!: (v: unknown) => void
    mockApiPost.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      })
    )

    const first = mcpStore.testConfig('cfg-1')
    expect(mcpStore.testingConfigIds).toContain('cfg-1')
    const second = mcpStore.testConfig('cfg-1')
    resolve({ json: async () => tested })
    await Promise.all([first, second])

    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(mcpStore.testingConfigIds).not.toContain('cfg-1')
  })

  it('rethrows the untouched error and leaves stored data unchanged on failure', async () => {
    const error = new Response(null, { status: 401, headers: { 'x-user-mcp-auth-location': 'u' } })
    mockApiPost.mockRejectedValueOnce(error)

    await expect(mcpStore.testConfig('cfg-1')).rejects.toBe(error)

    expect(mcpStore.configs[0]).toEqual(baseConfig)
    expect(mcpStore.testingConfigIds).not.toContain('cfg-1')
  })

  it('returns the result even when the config is not in the list', async () => {
    mcpStore.configs = []
    mockApiPost.mockResolvedValueOnce({ json: async () => tested })

    const result = await mcpStore.testConfig('cfg-gone')

    expect(result.status).toBe('success')
    expect(mcpStore.configs).toEqual([])
  })
})
