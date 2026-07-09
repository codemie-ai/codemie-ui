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
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    redirectHandler: null,
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/utils/user', () => ({
  formatUserOptions: vi.fn((users) => users.map((u: any) => ({ label: u.name, value: u.id }))),
}))

describe('userStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getUserProjects', () => {
    it('returns all projects as ProjectOption objects when adminOnly is false', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: ['proj-a', 'proj-b'],
        applicationsAdmin: [],
        projects: [
          { name: 'proj-b', display_name: 'Project B', is_project_admin: false },
          { name: 'proj-a', display_name: 'Project A', is_project_admin: true },
        ],
        picture: null,
      } as any

      const result = userStore.getUserProjects()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'proj-a', display_name: 'Project A' })
      expect(result[1]).toEqual({ name: 'proj-b', display_name: 'Project B' })
    })

    it('returns only admin projects when adminOnly is true', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [
          { name: 'admin-proj', display_name: 'Admin Project', is_project_admin: true },
          { name: 'regular-proj', display_name: null, is_project_admin: false },
        ],
        picture: null,
      } as any

      const result = userStore.getUserProjects(true)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('admin-proj')
    })

    it('includes display_name in returned ProjectOption objects', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [{ name: 'proj-x', display_name: 'X Project', is_project_admin: false }],
        picture: null,
      } as any

      const result = userStore.getUserProjects()

      expect(result[0]).toMatchObject({ name: 'proj-x', display_name: 'X Project' })
    })

    it('returns empty array when user has no projects', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [],
        picture: null,
      } as any

      const result = userStore.getUserProjects()
      expect(result).toEqual([])
    })

    it('returns empty array when user is null', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = null

      const result = userStore.getUserProjects()
      expect(result).toEqual([])
    })

    it('sorts projects alphabetically by name', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [
          { name: 'zzz', display_name: null, is_project_admin: false },
          { name: 'aaa', display_name: null, is_project_admin: false },
          { name: 'mmm', display_name: null, is_project_admin: false },
        ],
        picture: null,
      } as any

      const result = userStore.getUserProjects()

      expect(result.map((p: { name: string }) => p.name)).toEqual(['aaa', 'mmm', 'zzz'])
    })
  })

  describe('getAdminProjects', () => {
    it('merges user projects with admin API results, deduplicating by name', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: true,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [{ name: 'shared-proj', display_name: 'Shared', is_project_admin: true }],
        picture: null,
      } as any

      mockGet.mockResolvedValue({
        json: async () => ({
          applications: [
            { name: 'shared-proj', display_name: 'Shared' },
            { name: 'admin-only', display_name: 'Admin Only' },
          ],
        }),
      })

      const result = await userStore.getAdminProjects('shar')

      // shared-proj from user projects should appear once, admin-only added from API
      expect(result.filter((p: { name: string }) => p.name === 'shared-proj')).toHaveLength(1)
      expect(result.some((p: { name: string }) => p.name === 'admin-only')).toBe(true)
    })

    it('returns user projects when API call fails', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: true,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [{ name: 'fallback-proj', display_name: 'Fallback', is_project_admin: true }],
        picture: null,
      } as any

      mockGet.mockRejectedValue(new Error('Network error'))

      const result = await userStore.getAdminProjects('fallback')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('fallback-proj')
    })
  })

  describe('getDefaultProject', () => {
    it('returns the name of the first project', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [
          { name: 'first-proj', display_name: 'First', is_project_admin: false },
          { name: 'second-proj', display_name: null, is_project_admin: false },
        ],
        picture: null,
      } as any

      const result = await userStore.getDefaultProject()

      expect(result).toBe('first-proj')
    })

    it('returns null when user has no projects', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [],
        picture: null,
      } as any

      const result = await userStore.getDefaultProject()

      expect(result).toBeNull()
    })
  })

  describe('getProjects', () => {
    it('delegates to getAdminProjects when user is admin', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: true,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [],
        picture: null,
      } as any

      mockGet.mockResolvedValue({
        json: async () => ({ applications: [{ name: 'admin-proj', display_name: null }] }),
      })

      const result = await userStore.getProjects('admin')

      expect(mockGet).toHaveBeenCalled()
      expect(Array.isArray(result)).toBe(true)
    })

    it('delegates to getUserProjects when user is not admin', async () => {
      const { userStore } = await import('@/store/user')
      userStore.user = {
        userId: 'u1',
        email: 'a@b.com',
        name: 'Alice',
        username: 'alice',
        isAdmin: false,
        isMaintainer: false,
        isAuthenticated: true,
        user_type: 'regular',
        applications: [],
        applicationsAdmin: [],
        projects: [{ name: 'user-proj', display_name: 'User Proj', is_project_admin: false }],
        picture: null,
      } as any

      const result = await userStore.getProjects()

      expect(mockGet).not.toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('user-proj')
    })
  })
})
