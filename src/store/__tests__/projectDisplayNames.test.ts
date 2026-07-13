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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { projectDisplayNamesStore } from '../projectDisplayNames'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}))

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) })

describe('projectDisplayNamesStore', () => {
  beforeEach(() => {
    mockGet.mockReset()
    // Reset the shared cache between tests.
    Object.keys(projectDisplayNamesStore.cache).forEach(
      (key) => delete projectDisplayNamesStore.cache[key]
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and caches the trimmed display name', async () => {
    mockGet.mockResolvedValue(jsonResponse({ name: 'proj-a', display_name: '  Project Alpha  ' }))

    await projectDisplayNamesStore.ensure('proj-a')

    expect(mockGet).toHaveBeenCalledWith('v1/projects/proj-a')
    expect(projectDisplayNamesStore.cache['proj-a']).toBe('Project Alpha')
  })

  it('caches an empty string when the project has no display name', async () => {
    mockGet.mockResolvedValue(jsonResponse({ name: 'proj-b', display_name: null }))

    await projectDisplayNamesStore.ensure('proj-b')

    expect(projectDisplayNamesStore.cache['proj-b']).toBe('')
  })

  it('does not refetch a project that is already resolved (including negatives)', async () => {
    mockGet.mockResolvedValue(jsonResponse({ name: 'proj-c', display_name: '' }))

    await projectDisplayNamesStore.ensure('proj-c')
    await projectDisplayNamesStore.ensure('proj-c')

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent lookups of the same project', async () => {
    mockGet.mockResolvedValue(jsonResponse({ name: 'proj-d', display_name: 'Project Delta' }))

    await Promise.all([
      projectDisplayNamesStore.ensure('proj-d'),
      projectDisplayNamesStore.ensure('proj-d'),
    ])

    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(projectDisplayNamesStore.cache['proj-d']).toBe('Project Delta')
  })

  it('ignores an empty project name', async () => {
    await projectDisplayNamesStore.ensure('')

    expect(mockGet).not.toHaveBeenCalled()
  })

  it('leaves the project uncached when the request fails, allowing a retry', async () => {
    mockGet.mockRejectedValueOnce(new Error('403'))
    await projectDisplayNamesStore.ensure('proj-e')
    expect('proj-e' in projectDisplayNamesStore.cache).toBe(false)

    mockGet.mockResolvedValueOnce(jsonResponse({ name: 'proj-e', display_name: 'Project Echo' }))
    await projectDisplayNamesStore.ensure('proj-e')
    expect(projectDisplayNamesStore.cache['proj-e']).toBe('Project Echo')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('drops a cached entry so the next ensure re-fetches it', async () => {
    mockGet.mockResolvedValueOnce(jsonResponse({ name: 'proj-f', display_name: 'Old Name' }))
    await projectDisplayNamesStore.ensure('proj-f')
    expect(projectDisplayNamesStore.cache['proj-f']).toBe('Old Name')

    projectDisplayNamesStore.invalidate('proj-f')
    expect('proj-f' in projectDisplayNamesStore.cache).toBe(false)

    mockGet.mockResolvedValueOnce(jsonResponse({ name: 'proj-f', display_name: 'New Name' }))
    await projectDisplayNamesStore.ensure('proj-f')
    expect(projectDisplayNamesStore.cache['proj-f']).toBe('New Name')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
