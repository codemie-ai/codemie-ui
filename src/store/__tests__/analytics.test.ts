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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AiAdoptionConfig, AiAdoptionConfigResponse } from '@/types/analytics'
import api from '@/utils/api'

import { analyticsStore } from '../analytics'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const sampleConfig = {
  ai_maturity: {
    activation_threshold: { value: 20, description: 'x' },
  },
} as unknown as AiAdoptionConfig

beforeEach(() => {
  vi.clearAllMocks()
  analyticsStore.aiAdoptionConfig = null
  analyticsStore.error = {}
  analyticsStore.loading = {}
})

describe('saveAiAdoptionConfig', () => {
  it('calls api.put with correct payload and updates store on success', async () => {
    const responseBody: AiAdoptionConfigResponse = {
      data: sampleConfig,
      metadata: { timestamp: '2026-01-01T00:00:00Z', version: '1.0', description: 'saved' },
    }
    mockApi.put.mockResolvedValueOnce({
      json: () => Promise.resolve(responseBody),
    })

    const result = await analyticsStore.saveAiAdoptionConfig(sampleConfig)

    expect(mockApi.put).toHaveBeenCalledWith('v1/analytics/ai-adoption-config', sampleConfig, {
      skipErrorHandling: true,
    })
    expect(result).toEqual(responseBody)
    expect(analyticsStore.aiAdoptionConfig).toEqual(responseBody)
  })

  it('sets error state and rethrows on API failure', async () => {
    const apiError = new Error('save failed')
    mockApi.put.mockRejectedValueOnce(apiError)

    await expect(analyticsStore.saveAiAdoptionConfig(sampleConfig)).rejects.toThrow()

    expect(analyticsStore.error['ai-adoption-config']).toBeTruthy()
  })
})

describe('resetAiAdoptionConfig', () => {
  it('calls api.delete and updates store with returned defaults', async () => {
    const defaultsResponse: AiAdoptionConfigResponse = {
      data: sampleConfig,
      metadata: { timestamp: '2026-01-01T00:00:00Z', version: '1.0', description: 'defaults' },
    }
    mockApi.delete.mockResolvedValueOnce({
      json: () => Promise.resolve(defaultsResponse),
    })

    const result = await analyticsStore.resetAiAdoptionConfig()

    expect(mockApi.delete).toHaveBeenCalledWith('v1/analytics/ai-adoption-config', undefined, {
      skipErrorHandling: true,
    })
    expect(result).toEqual(defaultsResponse)
    expect(analyticsStore.aiAdoptionConfig).toEqual(defaultsResponse)
    expect(analyticsStore.loading['ai-adoption-config']).toBe(false)
  })

  it('sets error state and rethrows on API failure', async () => {
    const apiError = new Error('reset failed')
    mockApi.delete.mockRejectedValueOnce(apiError)

    await expect(analyticsStore.resetAiAdoptionConfig()).rejects.toThrow()

    expect(analyticsStore.error['ai-adoption-config']).toBeTruthy()
    expect(analyticsStore.loading['ai-adoption-config']).toBe(false)
  })
})
