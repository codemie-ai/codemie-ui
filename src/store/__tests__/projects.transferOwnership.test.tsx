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

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockPatch = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

describe('projectsStore.transferOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls PUT on the ownership endpoint with the exact URL/body and updates the matching project', async () => {
    mockPut.mockResolvedValue({
      json: async () => ({ name: 'proj-a', created_by: 'user-123', message: 'ok' }),
    })

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }]

    await projectsStore.transferOwnership('proj-a', 'user-123')

    expect(mockPut).toHaveBeenCalledWith('v1/projects/proj-a/ownership', { user_id: 'user-123' })
    expect(projectsStore.projects[0].created_by).toBe('user-123')
  })

  it('URL-encodes the project name', async () => {
    mockPut.mockResolvedValue({
      json: async () => ({ name: 'project with spaces', created_by: 'user-123' }),
    })

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'project with spaces', name: 'project with spaces' }]

    await projectsStore.transferOwnership('project with spaces', 'user-123')

    const url = mockPut.mock.calls[0][0] as string
    expect(url).toContain('project%20with%20spaces')
  })

  it('returns the updated project with id set to name', async () => {
    mockPut.mockResolvedValue({
      json: async () => ({ name: 'proj-a', created_by: 'user-123' }),
    })

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }]

    const result = await projectsStore.transferOwnership('proj-a', 'user-123')

    expect(result.id).toBe('proj-a')
    expect(result.created_by).toBe('user-123')
  })

  it('propagates a rejected call without swallowing it, leaving cached project unchanged', async () => {
    mockPut.mockRejectedValue(new Error('ownership transfer failed'))

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }]

    await expect(projectsStore.transferOwnership('proj-a', 'user-123')).rejects.toThrow(
      'ownership transfer failed'
    )
    expect(projectsStore.projects[0].created_by).toBe('old-user')
  })

  it('sets loading to false after a failed transfer', async () => {
    mockPut.mockRejectedValue(new Error('ownership transfer failed'))

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }]

    try {
      await projectsStore.transferOwnership('proj-a', 'user-123')
    } catch {
      // expected
    }
    expect(projectsStore.loading).toBe(false)
  })

  it('throws a clear error and leaves the cache unchanged when the response has no name', async () => {
    mockPut.mockResolvedValue({
      json: async () => ({ created_by: 'user-123' }),
    })

    const { projectsStore } = await import('@/store/projects')
    projectsStore.projects = [{ id: 'proj-a', name: 'proj-a', created_by: 'old-user' }]

    await expect(projectsStore.transferOwnership('proj-a', 'user-123')).rejects.toThrow(
      /missing the project name/i
    )
    expect(projectsStore.projects[0].created_by).toBe('old-user')
  })
})
