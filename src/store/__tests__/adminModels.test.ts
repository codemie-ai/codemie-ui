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

import { appInfoStore } from '@/store/appInfo'
import { AdminModel } from '@/types/entity/adminModel'
import toaster from '@/utils/toaster'

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { getLLMModels: vi.fn().mockResolvedValue([]) },
}))

const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockPost = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

/** Shapes a `POST v1/admin/llm/status/bulk` reply the way the router returns it. */
const bulkReply = (results: Array<{ base_name: string; status: string; success: boolean }>) => ({
  json: () =>
    Promise.resolve({
      data: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results: results.map((r) => ({ ...r, error: r.success ? null : 'failed' })),
      },
    }),
})

const mockModels: AdminModel[] = [
  {
    base_name: 'gpt-4',
    modelType: 'chat',
    label: 'GPT-4',
    provider: 'azure_openai',
    enabled: true,
    status: 'enabled',
  },
  {
    base_name: 'claude-3',
    modelType: 'chat',
    label: 'Claude 3',
    provider: 'anthropic',
    enabled: true,
    status: 'disabled',
  },
]

const catalogReply = (models: AdminModel[]) => ({
  json: async () => ({
    data: models.map((model) => ({
      base_name: model.base_name,
      label: model.label,
      model_type: model.modelType,
      enabled: model.enabled,
      status: model.status,
      provider: model.provider,
      router_type: model.routerType,
    })),
  }),
})

describe('adminModelsStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { adminModelsStore } = await import('@/store/adminModels')
    adminModelsStore.models = []
    adminModelsStore.loading = false
    adminModelsStore.globalDefault = null
    adminModelsStore.defaultError = null
    adminModelsStore.defaultLoading = false
  })

  describe('global default', () => {
    const savedDefault = {
      saved_base_name: 'gpt-4',
      updated_by_id: 'admin-1',
      updated_by_name: 'Administrator',
      updated_at: '2026-09-30T09:00:00Z',
      effective_base_name: 'claude-3',
      source: 'configured',
      temporary_fallback: true,
    }

    it('fetches saved and effective metadata', async () => {
      mockGet.mockResolvedValueOnce({ json: () => Promise.resolve(savedDefault) })
      const { adminModelsStore } = await import('@/store/adminModels')

      const result = await adminModelsStore.fetchGlobalDefault()

      expect(mockGet).toHaveBeenCalledWith('v1/admin/llm/default')
      expect(result).toEqual(savedDefault)
      expect(adminModelsStore.globalDefault).toEqual(savedDefault)
      expect(toaster.info).not.toHaveBeenCalled()
    })

    it('announces an automatic effective-default switch once across repeated refreshes', async () => {
      mockGet.mockResolvedValue({ json: () => Promise.resolve(savedDefault) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = mockModels.map((model) => ({ ...model }))
      adminModelsStore.globalDefault = { ...savedDefault, effective_base_name: 'gpt-4' }

      await adminModelsStore.fetchGlobalDefault()
      await adminModelsStore.fetchGlobalDefault()

      expect(toaster.info).toHaveBeenCalledOnce()
      expect(toaster.info).toHaveBeenCalledWith(
        'Global default model changed<br>Claude 3 is now used as the global default.'
      )
    })

    it('does not announce a fallback when the admin saved a different choice', async () => {
      const next = { ...savedDefault, saved_base_name: 'claude-3', effective_base_name: 'claude-3' }
      mockGet.mockResolvedValueOnce({ json: () => Promise.resolve(next) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.globalDefault = { ...savedDefault, effective_base_name: 'gpt-4' }

      await adminModelsStore.fetchGlobalDefault()

      expect(toaster.info).not.toHaveBeenCalled()
    })

    it('reports when no effective default is available', async () => {
      mockGet.mockResolvedValueOnce({
        json: () => Promise.resolve({ ...savedDefault, effective_base_name: null }),
      })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.globalDefault = savedDefault

      await adminModelsStore.fetchGlobalDefault()

      expect(toaster.info).toHaveBeenCalledWith(
        expect.stringContaining('No enabled model is available.')
      )
    })

    it('sets a selectable auto-router and refreshes default and catalog', async () => {
      const nextDefault = { ...savedDefault, saved_base_name: 'auto-router' }
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve(nextDefault) })
      mockGet
        .mockResolvedValueOnce({ json: () => Promise.resolve(nextDefault) })
        .mockResolvedValueOnce(catalogReply(mockModels))
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [
        {
          base_name: 'auto-router',
          modelType: 'chat',
          label: 'Auto',
          enabled: true,
          status: 'enabled',
        },
      ]

      await adminModelsStore.setGlobalDefault('auto-router')

      expect(mockPut).toHaveBeenCalledWith(
        'v1/admin/llm/default',
        { base_name: 'auto-router' },
        { skipErrorHandling: true }
      )
      expect(mockGet).toHaveBeenCalledWith('v1/admin/llm/default')
      expect(mockGet).toHaveBeenCalledWith('v1/admin/llm/status')
      expect(adminModelsStore.globalDefault).toEqual(nextDefault)
      expect(adminModelsStore.models).toEqual(mockModels)
      expect(appInfoStore.getLLMModels).toHaveBeenCalledOnce()
    })

    it('clears the saved choice and refreshes default and catalog', async () => {
      const cleared = { ...savedDefault, saved_base_name: null, temporary_fallback: false }
      mockDelete.mockResolvedValueOnce({ json: () => Promise.resolve(cleared) })
      mockGet
        .mockResolvedValueOnce({ json: () => Promise.resolve(cleared) })
        .mockResolvedValueOnce(catalogReply(mockModels))
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.globalDefault = savedDefault

      await adminModelsStore.clearGlobalDefault()

      expect(mockDelete).toHaveBeenCalledWith('v1/admin/llm/default', undefined, {
        skipErrorHandling: true,
      })
      expect(adminModelsStore.globalDefault).toEqual(cleared)
      expect(adminModelsStore.models).toEqual(mockModels)
      expect(appInfoStore.getLLMModels).toHaveBeenCalledOnce()
    })

    it('preserves state and exposes backend validation detail on rejected set', async () => {
      const error = new Response(JSON.stringify({ detail: 'Model is not selectable' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
      mockPut.mockRejectedValueOnce(error)
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.globalDefault = savedDefault
      adminModelsStore.models = [...mockModels]

      await expect(adminModelsStore.setGlobalDefault('gpt-4')).rejects.toBe(error)

      expect(adminModelsStore.globalDefault).toEqual(savedDefault)
      expect(adminModelsStore.models).toEqual(mockModels)
      expect(adminModelsStore.defaultError).toBe('Model is not selectable')
      expect(mockGet).not.toHaveBeenCalled()
      expect(appInfoStore.getLLMModels).not.toHaveBeenCalled()
    })

    it('preserves state and exposes backend validation detail on rejected clear', async () => {
      const error = { response: { data: { detail: 'Forbidden' } } }
      mockDelete.mockRejectedValueOnce(error)
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.globalDefault = savedDefault

      await expect(adminModelsStore.clearGlobalDefault()).rejects.toBe(error)

      expect(adminModelsStore.globalDefault).toEqual(savedDefault)
      expect(adminModelsStore.defaultError).toBe('Forbidden')
      expect(mockGet).not.toHaveBeenCalled()
    })
  })

  it('initializes with empty models array', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(adminModelsStore.models).toEqual([])
  })

  it('initializes loading as false', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(adminModelsStore.loading).toBe(false)
  })

  it('has indexModels method', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(typeof adminModelsStore.indexModels).toBe('function')
  })

  it('has setModelStatus method', async () => {
    const { adminModelsStore } = await import('@/store/adminModels')
    expect(typeof adminModelsStore.setModelStatus).toBe('function')
  })

  describe('indexModels', () => {
    it('calls GET /v1/admin/llm/status', async () => {
      mockGet.mockResolvedValueOnce(catalogReply([]))
      const { adminModelsStore } = await import('@/store/adminModels')

      await adminModelsStore.indexModels()

      expect(mockGet).toHaveBeenCalledWith('v1/admin/llm/status')
    })

    it('populates models from the response and returns them', async () => {
      mockGet.mockResolvedValueOnce(catalogReply(mockModels))
      const { adminModelsStore } = await import('@/store/adminModels')

      const result = await adminModelsStore.indexModels()

      expect(result).toEqual(mockModels)
      expect(adminModelsStore.models).toEqual(mockModels)
    })

    it('includes embeddings and admin-disabled models while hiding provider-unavailable models', async () => {
      const embedding: AdminModel = {
        base_name: 'embed',
        label: 'Embedding',
        modelType: 'embedding',
        enabled: true,
        status: 'deprecated',
      }
      mockGet.mockResolvedValueOnce(
        catalogReply([
          ...mockModels,
          embedding,
          { ...embedding, base_name: 'offline', enabled: false },
        ])
      )
      const { adminModelsStore } = await import('@/store/adminModels')
      const models = await adminModelsStore.indexModels()
      expect(models.map((model) => model.base_name)).toEqual(['gpt-4', 'claude-3', 'embed'])
      expect(models[1].status).toBe('disabled')
      expect(models[2].modelType).toBe('embedding')
      expect(mockGet).toHaveBeenCalledOnce()
      expect(mockGet).toHaveBeenCalledWith('v1/admin/llm/status')
    })

    it('sets loading to false after fetch completes', async () => {
      mockGet.mockResolvedValueOnce(catalogReply([]))
      const { adminModelsStore } = await import('@/store/adminModels')

      await adminModelsStore.indexModels()

      expect(adminModelsStore.loading).toBe(false)
    })
  })

  it('maps selectable auto-router availability and status', async () => {
    mockGet.mockResolvedValueOnce(
      catalogReply([
        {
          base_name: 'auto',
          label: 'Auto',
          modelType: 'chat',
          enabled: true,
          routerType: 'litellm_auto',
          status: 'enabled',
        },
        {
          base_name: 'old-auto',
          label: 'Old Auto',
          modelType: 'chat',
          enabled: true,
          routerType: 'litellm_auto',
          status: 'deprecated',
        },
      ])
    )
    const { adminModelsStore } = await import('@/store/adminModels')

    const models = await adminModelsStore.indexModels()

    expect(models[0]).toEqual(
      expect.objectContaining({ enabled: true, status: 'enabled', routerType: 'litellm_auto' })
    )
    expect(models[1]).toEqual(
      expect.objectContaining({ enabled: true, status: 'deprecated', routerType: 'litellm_auto' })
    )
  })

  describe('setModelStatus', () => {
    it('calls PUT /v1/admin/llm/{baseName}/status with the status body', async () => {
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await adminModelsStore.setModelStatus('gpt-4', 'disabled')

      expect(mockPut).toHaveBeenCalledWith('v1/admin/llm/gpt-4/status', { status: 'disabled' })
    })

    it('patches the model status in place without re-fetching', async () => {
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await adminModelsStore.setModelStatus('gpt-4', 'deprecated')

      expect(adminModelsStore.models[0].status).toBe('deprecated')
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('re-throws on API error', async () => {
      mockPut.mockRejectedValueOnce(new Error('Forbidden'))
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await expect(adminModelsStore.setModelStatus('gpt-4', 'disabled')).rejects.toThrow(
        'Forbidden'
      )
    })

    it('percent-encodes base_name in the PUT path so slashes do not create extra segments', async () => {
      mockPut.mockResolvedValueOnce({ json: () => Promise.resolve({}) })
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = []

      await adminModelsStore.setModelStatus('org/model-v2', 'disabled')

      expect(mockPut).toHaveBeenCalledWith('v1/admin/llm/org%2Fmodel-v2/status', {
        status: 'disabled',
      })
    })
  })

  describe('bulkSetModelStatus', () => {
    it('posts the whole selection as one updates list', async () => {
      mockPost.mockResolvedValueOnce(
        bulkReply([
          { base_name: 'gpt-4', status: 'disabled', success: true },
          { base_name: 'claude-3', status: 'disabled', success: true },
        ])
      )
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      const outcome = await adminModelsStore.bulkSetModelStatus(['gpt-4', 'claude-3'], 'disabled')

      expect(mockPost).toHaveBeenCalledOnce()
      expect(mockPost).toHaveBeenCalledWith('v1/admin/llm/status/bulk', {
        updates: [
          { base_name: 'gpt-4', status: 'disabled' },
          { base_name: 'claude-3', status: 'disabled' },
        ],
      })
      expect(outcome).toEqual(expect.objectContaining({ total: 2, succeeded: 2, failed: 0 }))
    })

    it('splits a selection above the 100-item server cap into chunks', async () => {
      const baseNames = Array.from({ length: 150 }, (_, i) => `model-${i}`)
      mockPost
        .mockResolvedValueOnce(
          bulkReply(
            baseNames.slice(0, 100).map((base_name) => ({
              base_name,
              status: 'enabled',
              success: true,
            }))
          )
        )
        .mockResolvedValueOnce(
          bulkReply(
            baseNames.slice(100).map((base_name) => ({
              base_name,
              status: 'enabled',
              success: true,
            }))
          )
        )
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = []

      const outcome = await adminModelsStore.bulkSetModelStatus(baseNames, 'enabled')

      expect(mockPost).toHaveBeenCalledTimes(2)
      expect(mockPost.mock.calls[0][1].updates).toHaveLength(100)
      expect(mockPost.mock.calls[1][1].updates).toHaveLength(50)
      expect(outcome.total).toBe(150)
      expect(outcome.succeeded).toBe(150)
    })

    it('applies only the confirmed items locally and reports the failures', async () => {
      mockPost.mockResolvedValueOnce(
        bulkReply([
          { base_name: 'gpt-4', status: 'deprecated', success: true },
          { base_name: 'claude-3', status: 'deprecated', success: false },
        ])
      )
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]
      const claudeStatusBefore = adminModelsStore.models[1].status

      const outcome = await adminModelsStore.bulkSetModelStatus(['gpt-4', 'claude-3'], 'deprecated')

      expect(adminModelsStore.models[0].status).toBe('deprecated')
      expect(adminModelsStore.models[1].status).toBe(claudeStatusBefore)
      expect(outcome.succeeded).toBe(1)
      expect(outcome.failed).toBe(1)
    })

    it('re-throws on API error', async () => {
      mockPost.mockRejectedValueOnce(new Error('Forbidden'))
      const { adminModelsStore } = await import('@/store/adminModels')
      adminModelsStore.models = [...mockModels]

      await expect(adminModelsStore.bulkSetModelStatus(['gpt-4'], 'disabled')).rejects.toThrow(
        'Forbidden'
      )
    })
  })
})
