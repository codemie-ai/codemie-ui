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

import { userSettingsStore } from '@/store/userSettings'
import api from '@/utils/api'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>

const okResponse = (data: unknown) => ({ json: async () => data })

const sampleSetting = {
  id: 's-1',
  alias: 'my jira',
  credential_type: 'Jira',
  setting_type: 'user',
  project_name: 'proj-a',
}

describe('userSettingsStore.indexSettings — scope-aware cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the shared singleton state between tests.
    userSettingsStore.isSettingsIndexed = false
    userSettingsStore.indexedMarketplace = false
    userSettingsStore.settings = {}
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the plain endpoint for project-shared and the marketplace scope for marketplace', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available')

    // Switching scope must re-fetch (project-shared -> marketplace).
    await userSettingsStore.indexSettings(true)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available?scope=marketplace')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('re-fetches when the scope switches from marketplace back to project-shared', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(true)
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available')
  })

  it('short-circuits a repeated same-scope call without an extra request', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('groups fetched settings by lower-cased credential_type', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)

    expect(userSettingsStore.settings).toEqual({ jira: [sampleSetting] })
  })

  it('does NOT mark the cache indexed when the fetch fails, so the next call re-fetches', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'))

    await expect(userSettingsStore.indexSettings(false)).rejects.toThrow('network down')

    // The failed fetch must not have flagged the cache as populated.
    expect(userSettingsStore.isSettingsIndexed).toBe(false)
    expect(userSettingsStore.settings).toEqual({})

    // A subsequent call honestly re-fetches instead of short-circuiting on stale/empty settings.
    mockGet.mockResolvedValue(okResponse([sampleSetting]))
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(userSettingsStore.isSettingsIndexed).toBe(true)
    expect(userSettingsStore.settings).toEqual({ jira: [sampleSetting] })
  })
})
