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

import { projectModelSettingsStore } from '@/store/projectModelSettings'
import { DEFAULT_PROJECT_MODEL_SETTINGS } from '@/types/entity/projectModelSettings'

const mockGet = vi.fn()
const mockPatch = vi.fn()
const mockInvalidate = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { invalidateProjectLLMModels: (...args: unknown[]) => mockInvalidate(...args) },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: (...args: unknown[]) => mockToastError(...args) },
}))

const respond = (body: unknown) => ({ json: () => Promise.resolve(body) })

describe('projectModelSettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    projectModelSettingsStore.settingsByProject = {}
    projectModelSettingsStore.error = null
  })

  it('maps the project detail allow-list and encodes the project name', async () => {
    mockGet.mockResolvedValue(respond({ allowed_models: ['a'], default_model: 'a' }))

    const settings = await projectModelSettingsStore.fetchSettings('team a')

    expect(mockGet).toHaveBeenCalledWith('v1/projects/team%20a', { skipErrorHandling: true })
    expect(settings).toEqual({
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      mode: 'allow_list',
      models: ['a'],
      default_model: 'a',
    })
    expect(projectModelSettingsStore.settingsByProject['team a']).toEqual(settings)
  })

  it('maps a project with no allow-list to unrestricted mode', async () => {
    mockGet.mockResolvedValue(respond({ allowed_models: null, default_model: null }))

    const settings = await projectModelSettingsStore.fetchSettings('p')

    expect(settings).toEqual(DEFAULT_PROJECT_MODEL_SETTINGS)
  })

  it('records a load error without toasting', async () => {
    mockGet.mockRejectedValue({ parsedError: { message: 'Not found' } })

    await expect(projectModelSettingsStore.fetchSettings('p')).rejects.toBeTruthy()

    expect(projectModelSettingsStore.error).toBe('Not found')
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('saves an allow-list through the existing allowed-models endpoint', async () => {
    const settings = {
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      mode: 'allow_list' as const,
      models: ['a'],
    }
    mockPatch.mockResolvedValue(respond({ allowed_models: ['a'], default_model: null }))

    const saved = await projectModelSettingsStore.saveSettings('p', settings)

    expect(mockPatch).toHaveBeenCalledWith(
      'v1/projects/p/allowed-models',
      { allowed_models: ['a'], default_model: null },
      { skipErrorHandling: true }
    )
    expect(saved).toEqual(settings)
    expect(mockInvalidate).toHaveBeenCalledWith('p')
    expect(projectModelSettingsStore.settingsByProject.p).toEqual(settings)
  })

  it('saves unrestricted mode as a null allow-list', async () => {
    mockPatch.mockResolvedValue(respond({ allowed_models: null, default_model: null }))

    await projectModelSettingsStore.saveSettings('p', DEFAULT_PROJECT_MODEL_SETTINGS)

    expect(mockPatch).toHaveBeenCalledWith(
      'v1/projects/p/allowed-models',
      { allowed_models: null, default_model: null },
      { skipErrorHandling: true }
    )
  })

  it('toasts the backend detail when a save is rejected', async () => {
    mockPatch.mockRejectedValue({
      parsedError: { message: 'Invalid', details: 'Every enabled model is hidden' },
    })

    await expect(
      projectModelSettingsStore.saveSettings('p', DEFAULT_PROJECT_MODEL_SETTINGS)
    ).rejects.toBeTruthy()

    expect(mockToastError).toHaveBeenCalledWith('Every enabled model is hidden')
    expect(projectModelSettingsStore.saving).toBe(false)
  })
})
