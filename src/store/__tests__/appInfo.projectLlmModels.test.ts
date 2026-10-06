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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

const mockGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: { get: (...args: unknown[]) => mockGet(...args) },
}))

const respond = (body: unknown) => ({ json: () => Promise.resolve(body) })

describe('appInfoStore project-scoped LLM models', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appInfoStore.projectLlmModels = {}
  })

  it('requests the list with the project filter and maps it', async () => {
    mockGet.mockResolvedValue(
      respond([{ base_name: 'model-b', label: 'Model B', default: true, is_premium: true }])
    )

    const models = await appInfoStore.getProjectLLMModels('p')

    expect(mockGet).toHaveBeenCalledWith('v1/llm_models', { params: { project_id: 'p' } })
    expect(models).toMatchObject([
      { value: 'model-b', label: 'Model B', isDefault: true, isPremium: true },
    ])
    expect(appInfoStore.projectLlmModels.p).toEqual(models)
  })

  it('shares one request between concurrent callers', async () => {
    mockGet.mockResolvedValue(respond([]))

    await Promise.all([
      appInfoStore.getProjectLLMModels('p'),
      appInfoStore.getProjectLLMModels('p'),
    ])

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('returns an empty list when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGet.mockRejectedValue(new Error('boom'))

    await expect(appInfoStore.getProjectLLMModels('p')).resolves.toEqual([])
  })

  it('invalidates one project or all of them', () => {
    appInfoStore.projectLlmModels = { a: [], b: [] }

    appInfoStore.invalidateProjectLLMModels('a')
    expect(Object.keys(appInfoStore.projectLlmModels)).toEqual(['b'])

    appInfoStore.invalidateProjectLLMModels()
    expect(appInfoStore.projectLlmModels).toEqual({})
  })
})
