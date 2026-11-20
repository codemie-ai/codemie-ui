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
import { userModelOverridesStore } from '@/store/userModelOverrides'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: (...args: unknown[]) => mockToastError(...args) },
}))

const respond = (body: unknown) => ({ json: () => Promise.resolve(body) })

describe('userModelOverridesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userModelOverridesStore.loading = false
    userModelOverridesStore.error = null
  })

  it('lists overrides for a project', async () => {
    mockGet.mockResolvedValue(respond([{ id: 'ov-1' }]))

    const result = await userModelOverridesStore.listUserModelOverrides('Test Project')

    expect(mockGet).toHaveBeenCalledWith('v1/projects/Test%20Project/user-model-overrides', {
      params: { skip: 0, limit: 100 },
      skipErrorHandling: true,
    })
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ id: 'ov-1' }])
  })

  it('pages through overrides beyond the first 100 records', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: `ov-${i}` }))
    const secondPage = [{ id: 'ov-100' }, { id: 'ov-101' }]
    mockGet.mockResolvedValueOnce(respond(firstPage)).mockResolvedValueOnce(respond(secondPage))

    const result = await userModelOverridesStore.listUserModelOverrides('Test Project')

    expect(mockGet).toHaveBeenNthCalledWith(1, 'v1/projects/Test%20Project/user-model-overrides', {
      params: { skip: 0, limit: 100 },
      skipErrorHandling: true,
    })
    expect(mockGet).toHaveBeenNthCalledWith(2, 'v1/projects/Test%20Project/user-model-overrides', {
      params: { skip: 100, limit: 100 },
      skipErrorHandling: true,
    })
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(result).toHaveLength(102)
  })

  it('gets a single override for a user', async () => {
    mockGet.mockResolvedValue(respond({ id: 'ov-1', user_id: 'u-1' }))

    const result = await userModelOverridesStore.getUserModelOverride('Test Project', 'u-1')

    expect(mockGet).toHaveBeenCalledWith('v1/projects/Test%20Project/user-model-overrides/u-1', {
      skipErrorHandling: true,
    })
    expect(result).toEqual({ id: 'ov-1', user_id: 'u-1' })
  })

  it('sets an override for a user', async () => {
    const payload = { allowed_models: ['gpt-4'], default_model: 'gpt-4' }
    mockPut.mockResolvedValue(respond({ id: 'ov-1', user_id: 'u-1', ...payload }))

    const result = await userModelOverridesStore.setUserModelOverride(
      'Test Project',
      'u-1',
      payload
    )

    expect(mockPut).toHaveBeenCalledWith(
      'v1/projects/Test%20Project/user-model-overrides/u-1',
      payload,
      { skipErrorHandling: true }
    )
    expect(result).toEqual({ id: 'ov-1', user_id: 'u-1', ...payload })
  })

  it('deletes an override for a user', async () => {
    mockDelete.mockResolvedValue(undefined)

    await userModelOverridesStore.deleteUserModelOverride('Test Project', 'u-1')

    expect(mockDelete).toHaveBeenCalledWith('v1/projects/Test%20Project/user-model-overrides/u-1', {
      skipErrorHandling: true,
    })
  })

  it('batch-updates overrides via the /batch endpoint', async () => {
    const payload = {
      operation: 'grant' as const,
      user_ids: ['u-1', 'u-2'],
      allowed_models: ['gpt-4'],
    }
    mockPost.mockResolvedValue(respond([{ id: 'ov-1' }, { id: 'ov-2' }]))

    const result = await userModelOverridesStore.batchUserModelOverrides('Test Project', payload)

    expect(mockPost).toHaveBeenCalledWith(
      'v1/projects/Test%20Project/user-model-overrides/batch',
      payload,
      { skipErrorHandling: true }
    )
    expect(result).toEqual([{ id: 'ov-1' }, { id: 'ov-2' }])
  })

  it('encodes project names and user ids containing path/query metacharacters', async () => {
    mockGet.mockResolvedValue(respond([]))
    mockPost.mockResolvedValue(respond({}))
    mockDelete.mockResolvedValue(undefined)

    await userModelOverridesStore.listUserModelOverrides('Team/Alpha?x=1')
    expect(mockGet).toHaveBeenCalledWith('v1/projects/Team%2FAlpha%3Fx%3D1/user-model-overrides', {
      params: { skip: 0, limit: 100 },
      skipErrorHandling: true,
    })

    await userModelOverridesStore.getUserModelOverride('Team/Alpha', 'u/1')
    expect(mockGet).toHaveBeenCalledWith('v1/projects/Team%2FAlpha/user-model-overrides/u%2F1', {
      skipErrorHandling: true,
    })

    await userModelOverridesStore.deleteUserModelOverride('Team/Alpha', 'u/1')
    expect(mockDelete).toHaveBeenCalledWith('v1/projects/Team%2FAlpha/user-model-overrides/u%2F1', {
      skipErrorHandling: true,
    })

    await userModelOverridesStore.setUserModelOverride('Team/Alpha', 'u/1', {
      allowed_models: ['gpt-4'],
    })
    expect(mockPut).toHaveBeenCalledWith(
      'v1/projects/Team%2FAlpha/user-model-overrides/u%2F1',
      { allowed_models: ['gpt-4'] },
      { skipErrorHandling: true }
    )

    await userModelOverridesStore.batchUserModelOverrides('Team/Alpha', {
      operation: 'grant',
      user_ids: ['u-1'],
    })
    expect(mockPost).toHaveBeenCalledWith(
      'v1/projects/Team%2FAlpha/user-model-overrides/batch',
      { operation: 'grant', user_ids: ['u-1'] },
      { skipErrorHandling: true }
    )
  })

  it('returns null when getUserModelOverride 404s', async () => {
    mockGet.mockRejectedValue({ status: 404 })

    const result = await userModelOverridesStore.getUserModelOverride('Test Project', 'u-1')

    expect(result).toBeNull()
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('rethrows and toasts when getUserModelOverride fails with a non-404 error', async () => {
    mockGet.mockRejectedValue({ status: 500, message: 'boom' })

    await expect(
      userModelOverridesStore.getUserModelOverride('Test Project', 'u-1')
    ).rejects.toBeTruthy()

    expect(mockToastError).toHaveBeenCalledWith('boom')
  })

  it('toasts on a non-silent setUserModelOverride failure', async () => {
    mockPut.mockRejectedValue({ message: 'set failed' })

    await expect(
      userModelOverridesStore.setUserModelOverride('Test Project', 'u-1', {
        allowed_models: ['gpt-4'],
      })
    ).rejects.toThrow()

    expect(mockToastError).toHaveBeenCalledWith('set failed')
  })

  it('suppresses the toast on a silent setUserModelOverride failure', async () => {
    mockPut.mockRejectedValue({ message: 'set failed' })

    await expect(
      userModelOverridesStore.setUserModelOverride(
        'Test Project',
        'u-1',
        { allowed_models: ['gpt-4'] },
        true
      )
    ).rejects.toThrow()

    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('toasts on a non-silent deleteUserModelOverride failure', async () => {
    mockDelete.mockRejectedValue({ message: 'delete failed' })

    await expect(
      userModelOverridesStore.deleteUserModelOverride('Test Project', 'u-1')
    ).rejects.toThrow()

    expect(mockToastError).toHaveBeenCalledWith('delete failed')
  })

  it('suppresses the toast on a silent deleteUserModelOverride failure', async () => {
    mockDelete.mockRejectedValue({ message: 'delete failed' })

    await expect(
      userModelOverridesStore.deleteUserModelOverride('Test Project', 'u-1', true)
    ).rejects.toThrow()

    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('toasts on a non-silent batchUserModelOverrides failure', async () => {
    mockPost.mockRejectedValue({ message: 'batch failed' })

    await expect(
      userModelOverridesStore.batchUserModelOverrides('Test Project', {
        operation: 'grant',
        user_ids: ['u-1'],
      })
    ).rejects.toThrow()

    expect(mockToastError).toHaveBeenCalledWith('batch failed')
  })

  it('suppresses the toast on a silent batchUserModelOverrides failure', async () => {
    mockPost.mockRejectedValue({ message: 'batch failed' })

    await expect(
      userModelOverridesStore.batchUserModelOverrides(
        'Test Project',
        { operation: 'grant', user_ids: ['u-1'] },
        true
      )
    ).rejects.toThrow()

    expect(mockToastError).not.toHaveBeenCalled()
  })

  it.each([
    [
      'set',
      () =>
        userModelOverridesStore.setUserModelOverride('Team A', 'u-1', { allowed_models: ['m'] }),
    ],
    ['delete', () => userModelOverridesStore.deleteUserModelOverride('Team A', 'u-1')],
    [
      'batch',
      () =>
        userModelOverridesStore.batchUserModelOverrides('Team A', {
          operation: 'revoke',
          user_ids: ['u-1'],
        }),
    ],
  ])('invalidates the cached project model list after a successful %s', async (_name, run) => {
    mockPut.mockResolvedValue(respond({}))
    mockDelete.mockResolvedValue(undefined)
    mockPost.mockResolvedValue(respond([]))
    const invalidate = vi.spyOn(appInfoStore, 'invalidateProjectLLMModels')

    await run()

    expect(invalidate).toHaveBeenCalledWith('Team A')
    invalidate.mockRestore()
  })

  it('does not invalidate the cached project model list when the change fails', async () => {
    mockPut.mockRejectedValue({ message: 'nope' })
    const invalidate = vi.spyOn(appInfoStore, 'invalidateProjectLLMModels')

    await expect(
      userModelOverridesStore.setUserModelOverride('Team A', 'u-1', { allowed_models: ['m'] }, true)
    ).rejects.toBeDefined()

    expect(invalidate).not.toHaveBeenCalled()
    invalidate.mockRestore()
  })

  it('toasts the message of a failed batch and rethrows the error with its details', async () => {
    const failed = {
      parsedError: {
        message: 'Batch operation failed; no users updated',
        details: 'u-1: Model x is not allowed',
      },
    }
    mockPost.mockRejectedValue(failed)

    await expect(
      userModelOverridesStore.batchUserModelOverrides('Team A', {
        operation: 'grant',
        user_ids: ['u-1'],
      })
    ).rejects.toBe(failed)

    expect(mockToastError).toHaveBeenCalledWith('Batch operation failed; no users updated')
  })
})
