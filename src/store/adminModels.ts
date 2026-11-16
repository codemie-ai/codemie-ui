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

import { appInfoStore } from '@/store/appInfo'
import {
  AdminGlobalDefaultResponse,
  AdminModel,
  AdminModelCatalogItem,
  BulkStatusOutcome,
  BulkStatusResult,
} from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

const DEFAULT_ENDPOINT = 'v1/admin/llm/default'

/** `LLMModelStatusBulkUpdateRequest.updates` is capped at 100 items server-side. */
const BULK_STATUS_CHUNK_SIZE = 100

const defaultErrorMessage = async (error: unknown): Promise<string> => {
  if (error instanceof Response) {
    try {
      const body = await error.clone().json()
      const detail = body?.detail ?? body?.error?.details ?? body?.error?.message
      if (typeof detail === 'string') return detail
    } catch {
      // A response without JSON falls back to the HTTP status.
    }
    return error.statusText || `Request failed (${error.status})`
  }

  const value = error as {
    response?: { data?: { detail?: string; message?: string } }
    message?: string
  } | null
  return (
    value?.response?.data?.detail ??
    value?.response?.data?.message ??
    value?.message ??
    'Request failed'
  )
}

interface AdminModelsStore {
  models: AdminModel[]
  loading: boolean
  globalDefault: AdminGlobalDefaultResponse | null
  defaultLoading: boolean
  defaultError: string | null
  indexModels: () => Promise<AdminModel[]>
  setModelStatus: (baseName: string, status: ModelStatus) => Promise<void>
  bulkSetModelStatus: (baseNames: string[], status: ModelStatus) => Promise<BulkStatusOutcome>
  fetchGlobalDefault: () => Promise<AdminGlobalDefaultResponse>
  setGlobalDefault: (baseName: string) => Promise<void>
  clearGlobalDefault: () => Promise<void>
}

export const adminModelsStore = proxy<AdminModelsStore>({
  models: [],
  loading: false,
  globalDefault: null,
  defaultLoading: false,
  defaultError: null,

  async indexModels() {
    this.loading = true
    try {
      const response = await api.get('v1/admin/llm/status')
      const { data }: { data: AdminModelCatalogItem[] } = await response.json()
      const models: AdminModel[] = data
        .filter((model) => model.enabled)
        .map((model) => ({
          base_name: model.base_name,
          modelType: model.model_type,
          label: model.label,
          provider: model.provider ?? undefined,
          enabled: model.enabled,
          status: model.status,
          routerType: model.router_type ?? undefined,
          isPremium: model.is_premium ?? undefined,
          multimodal: model.multimodal ?? undefined,
          supportsTools: model.supports_tools ?? undefined,
          supportsImageGeneration: model.supports_image_generation,
          cost: model.cost ? { input: model.cost.input, output: model.cost.output } : undefined,
        }))
      this.models = models
      return models
    } finally {
      this.loading = false
    }
  },

  async setModelStatus(baseName, status) {
    await api.put(`v1/admin/llm/${encodeURIComponent(baseName)}/status`, { status })
    const index = this.models.findIndex((m) => m.base_name === baseName)
    if (index !== -1) {
      this.models[index].status = status
    }
  },

  async bulkSetModelStatus(baseNames, status) {
    // The endpoint caps a request at 100 items, so a wider selection goes up in
    // chunks and the per-item outcomes are summed back into one result.
    const chunks: string[][] = []
    for (let i = 0; i < baseNames.length; i += BULK_STATUS_CHUNK_SIZE) {
      chunks.push(baseNames.slice(i, i + BULK_STATUS_CHUNK_SIZE))
    }

    const chunkResults = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await api.post('v1/admin/llm/status/bulk', {
          updates: chunk.map((base_name) => ({ base_name, status })),
        })
        const body = await response.json()
        return (body?.data?.results ?? []) as BulkStatusResult[]
      })
    )
    const results = chunkResults.flat()

    // Only the items the server confirmed are reflected locally; a failed item
    // keeps its previous status so the table matches what actually persisted.
    results.forEach((result) => {
      if (!result.success) return
      const index = this.models.findIndex((m) => m.base_name === result.base_name)
      if (index !== -1) {
        this.models[index].status = status
      }
    })

    const succeeded = results.filter((r) => r.success).length
    return {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    }
  },

  async fetchGlobalDefault() {
    this.defaultLoading = true
    this.defaultError = null
    try {
      const response = await api.get(DEFAULT_ENDPOINT)
      const data: AdminGlobalDefaultResponse = await response.json()
      const previousDefault = this.globalDefault
      this.globalDefault = data
      // Initial loads and explicit default selections are silent. Report an
      // automatic switch once, after the server confirms the effective model.
      if (
        previousDefault &&
        previousDefault.saved_base_name === data.saved_base_name &&
        previousDefault.effective_base_name !== data.effective_base_name
      ) {
        const model = this.models.find((item) => item.base_name === data.effective_base_name)
        toaster.info(
          data.effective_base_name
            ? `Global default model changed<br>${
                model?.label ?? data.effective_base_name
              } is now used as the global default.`
            : 'Global default model unavailable<br>No enabled model is available. Enable a model or restore provider availability to use a global default.'
        )
      }
      return data
    } catch (error) {
      this.defaultError = await defaultErrorMessage(error)
      throw error
    } finally {
      this.defaultLoading = false
    }
  },

  async setGlobalDefault(baseName) {
    this.defaultLoading = true
    this.defaultError = null
    try {
      await api.put(DEFAULT_ENDPOINT, { base_name: baseName }, { skipErrorHandling: true })
      await this.fetchGlobalDefault()
      await this.indexModels()
      await appInfoStore.getLLMModels()
    } catch (error) {
      this.defaultError = await defaultErrorMessage(error)
      throw error
    } finally {
      this.defaultLoading = false
    }
  },

  async clearGlobalDefault() {
    this.defaultLoading = true
    this.defaultError = null
    try {
      await api.delete(DEFAULT_ENDPOINT, undefined, { skipErrorHandling: true })
      await this.fetchGlobalDefault()
      await this.indexModels()
      await appInfoStore.getLLMModels()
    } catch (error) {
      this.defaultError = await defaultErrorMessage(error)
      throw error
    } finally {
      this.defaultLoading = false
    }
  },
})
