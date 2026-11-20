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

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_PROJECT_MODEL_SETTINGS } from '@/types/entity/projectModelSettings'

import { useProjectModelCatalog } from '../useProjectModelCatalog'

const { mockAppInfoStore, mockSettingsStore } = vi.hoisted(() => ({
  mockAppInfoStore: { getLLMModels: vi.fn(), getLLMCatalog: vi.fn() },
  mockSettingsStore: { fetchSettings: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/projectModelSettings', () => ({ projectModelSettingsStore: mockSettingsStore }))

const MODELS = [
  { label: 'Model A', value: 'model-a' },
  { label: 'Premium', value: 'premium', isPremium: true },
  { label: 'Model B', value: 'model-b' },
]
const ROUTER = { label: 'Router', value: 'router', tiers: {} }

const allowListSettings = {
  ...DEFAULT_PROJECT_MODEL_SETTINGS,
  mode: 'allow_list' as const,
  models: ['model-a', 'premium', 'router'],
  hide_premium_models: true,
}

describe('useProjectModelCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.getLLMModels.mockResolvedValue(MODELS)
    mockAppInfoStore.getLLMCatalog.mockResolvedValue({ models: MODELS, routers: [ROUTER] })
    mockSettingsStore.fetchSettings.mockResolvedValue(allowListSettings)
  })

  it('derives the selection and availability from the project settings, hiding premium models when asked', async () => {
    const { result } = renderHook(() =>
      useProjectModelCatalog('team', { includeRouters: false, hidePremium: true })
    )

    await waitFor(() => expect(result.current.data).not.toBeNull())
    const { data } = result.current
    expect(mockAppInfoStore.getLLMModels).toHaveBeenCalled()
    expect(mockAppInfoStore.getLLMCatalog).not.toHaveBeenCalled()
    expect(mockSettingsStore.fetchSettings).toHaveBeenCalledWith('team')
    expect(data?.models.map((model) => model.value)).toEqual(['model-a', 'premium', 'model-b'])
    expect(data?.selection).toEqual({
      'model-a': 'enabled',
      premium: 'enabled',
      'model-b': 'disabled',
    })
    expect(data?.availability).toEqual({ 'model-a': true, premium: false, 'model-b': false })
  })

  it('includes the routers and ignores the premium setting when asked', async () => {
    const { result } = renderHook(() =>
      useProjectModelCatalog('team', { includeRouters: true, hidePremium: false })
    )

    await waitFor(() => expect(result.current.data).not.toBeNull())
    const { data } = result.current
    expect(mockAppInfoStore.getLLMCatalog).toHaveBeenCalled()
    expect(data?.catalog.map((model) => model.value)).toEqual([
      'model-a',
      'premium',
      'model-b',
      'router',
    ])
    expect(data?.availability).toEqual({
      'model-a': true,
      premium: true,
      'model-b': false,
      router: true,
    })
  })

  it('loads nothing while disabled and loads again once enabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useProjectModelCatalog('team', { includeRouters: false, hidePremium: true, enabled }),
      { initialProps: { enabled: false } }
    )

    expect(result.current.data).toBeNull()
    expect(mockSettingsStore.fetchSettings).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    rerender({ enabled: false })
    expect(result.current.data).toBeNull()
  })

  it('reports a failed load as an error', async () => {
    const failure = new Error('403')
    mockSettingsStore.fetchSettings.mockRejectedValue(failure)

    const { result } = renderHook(() =>
      useProjectModelCatalog('team', { includeRouters: false, hidePremium: true })
    )

    await waitFor(() => expect(result.current.error).toBe(failure))
    expect(result.current.data).toBeNull()
  })

  it('drops a response for a project that is no longer requested', async () => {
    let resolveFirst!: (value: unknown) => void
    mockSettingsStore.fetchSettings
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        })
      )
      .mockResolvedValueOnce({ ...DEFAULT_PROJECT_MODEL_SETTINGS })

    const { result, rerender } = renderHook(
      ({ projectName }) =>
        useProjectModelCatalog(projectName, { includeRouters: false, hidePremium: true }),
      { initialProps: { projectName: 'first' } }
    )
    rerender({ projectName: 'second' })
    await waitFor(() => expect(result.current.data).not.toBeNull())

    resolveFirst(allowListSettings)
    await Promise.resolve()

    expect(result.current.data?.settings.mode).toBe('all')
  })
})
