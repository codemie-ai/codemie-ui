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

describe('projectsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('indexProjects', () => {
    it('fetches projects and stores them in state', async () => {
      const mockProjects = [
        { name: 'project-alpha', description: 'First project' },
        { name: 'project-beta', description: 'Second project' },
      ]
      mockGet.mockResolvedValue({
        json: async () => ({
          data: mockProjects,
          pagination: { page: 0, per_page: 10, total: 2 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.indexProjects()

      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('project-alpha')
      expect(result[0].name).toBe('project-alpha')
      expect(projectsStore.projects).toHaveLength(2)
    })

    it('uses name as id for each project', async () => {
      const mockProjects = [{ name: 'my-project', description: 'Test' }]
      mockGet.mockResolvedValue({
        json: async () => ({ data: mockProjects, pagination: {} }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.indexProjects()

      expect(result[0].id).toBe('my-project')
    })

    it('builds URL with default page and perPage params', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: {} }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.indexProjects()

      const url = mockGet.mock.calls[0][0] as string
      expect(url).toContain('v1/projects')
      expect(url).toContain('page=0')
      expect(url).toContain('per_page=10')
    })

    it('includes search param in URL when provided', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: {} }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.indexProjects(0, 10, 'my-search')

      const url = mockGet.mock.calls[0][0] as string
      expect(url).toContain('search=my-search')
    })

    it('does not include search param when search is undefined', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: {} }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.indexProjects(0, 10, undefined)

      const url = mockGet.mock.calls[0][0] as string
      expect(url).not.toContain('search=')
    })

    it('updates pagination state from response', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({
          data: [],
          pagination: { page: 1, per_page: 5, total: 20 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.indexProjects(1, 5)

      expect(projectsStore.pagination.page).toBe(1)
      expect(projectsStore.pagination.perPage).toBe(5)
      expect(projectsStore.pagination.totalCount).toBe(20)
      expect(projectsStore.pagination.totalPages).toBe(4)
    })

    it('sets loading to false after successful fetch', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: {} }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.indexProjects()

      expect(projectsStore.loading).toBe(false)
    })

    it('sets loading to false and throws on API error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { projectsStore } = await import('@/store/projects')
      await expect(projectsStore.indexProjects()).rejects.toThrow('Network error')
      expect(projectsStore.loading).toBe(false)
      expect(projectsStore.error).toContain('Failed to load projects')
    })

    it('handles empty data array in response', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({ data: [], pagination: { page: 0, per_page: 10, total: 0 } }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.indexProjects()

      expect(result).toEqual([])
      expect(projectsStore.projects).toHaveLength(0)
    })
  })

  describe('searchProjectsIncludingDisplayName', () => {
    it('finds a project by display_name even though the backend search param cannot', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({
          data: [
            { name: 'ssg-test', display_name: 'My Test Project', description: '' },
            { name: 'other-project', display_name: null, description: '' },
          ],
          pagination: { page: 0, per_page: 100, total: 2 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.searchProjectsIncludingDisplayName(0, 10, 'My Test')

      const url = mockGet.mock.calls[0][0] as string
      expect(url).not.toContain('search=')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('ssg-test')
      expect(projectsStore.projects).toHaveLength(1)
      expect(projectsStore.pagination.totalCount).toBe(1)
    })

    it('also matches on technical name and description', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({
          data: [
            { name: 'match-by-name', display_name: null, description: 'irrelevant' },
            { name: 'no-match', display_name: null, description: 'contains keyword here' },
          ],
          pagination: { page: 0, per_page: 100, total: 2 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.searchProjectsIncludingDisplayName(0, 10, 'keyword')

      expect(result.map((p) => p.name)).toEqual(['no-match'])
    })

    it('paginates across multiple backend pages until all projects are fetched', async () => {
      const pageOneProjects = Array.from({ length: 100 }, (_, i) => ({
        name: `proj-${i}`,
        display_name: 'No Match',
      }))

      mockGet
        .mockResolvedValueOnce({
          json: async () => ({
            data: pageOneProjects,
            pagination: { page: 0, per_page: 100, total: 101 },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: [{ name: 'proj-100', display_name: 'Alpha Beta' }],
            pagination: { page: 1, per_page: 100, total: 101 },
          }),
        })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.searchProjectsIncludingDisplayName(0, 10, 'alpha')

      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(result.map((p) => p.name)).toEqual(['proj-100'])
    })

    it('applies client-side pagination for the requested page', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({
          data: [
            { name: 'a-project', display_name: 'Test A' },
            { name: 'b-project', display_name: 'Test B' },
            { name: 'c-project', display_name: 'Test C' },
          ],
          pagination: { page: 0, per_page: 100, total: 3 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      const firstPage = await projectsStore.searchProjectsIncludingDisplayName(0, 2, 'Test')
      expect(firstPage).toHaveLength(2)

      const secondPage = await projectsStore.searchProjectsIncludingDisplayName(1, 2, 'Test')
      expect(secondPage).toHaveLength(1)
      expect(projectsStore.pagination.totalPages).toBe(2)
    })

    it('sorts matches client-side when sortBy is provided', async () => {
      mockGet.mockResolvedValue({
        json: async () => ({
          data: [
            { name: 'zeta-project', display_name: 'Test Zeta' },
            { name: 'alpha-project', display_name: 'Test Alpha' },
          ],
          pagination: { page: 0, per_page: 100, total: 2 },
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.searchProjectsIncludingDisplayName(
        0,
        10,
        'Test',
        'name',
        'asc'
      )

      expect(result.map((p) => p.name)).toEqual(['alpha-project', 'zeta-project'])
    })

    it('sets loading to false and throws on API error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const { projectsStore } = await import('@/store/projects')
      await expect(
        projectsStore.searchProjectsIncludingDisplayName(0, 10, 'anything')
      ).rejects.toThrow('Network error')
      expect(projectsStore.loading).toBe(false)
    })
  })

  describe('createProject', () => {
    it('posts to the correct endpoint with project data', async () => {
      const projectData = { name: 'new-project', description: 'A new project' }
      mockPost.mockResolvedValue({
        json: async () => ({ name: 'new-project', description: 'A new project' }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.createProject(projectData)

      expect(mockPost).toHaveBeenCalledWith('v1/projects', projectData, {
        skipErrorHandling: true,
      })
    })

    it('adds the new project to the beginning of the list', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({ name: 'newest-project', description: 'Just created' }),
      })

      const { projectsStore } = await import('@/store/projects')
      projectsStore.projects = [{ id: 'old-project', name: 'old-project' }]
      await projectsStore.createProject({ name: 'newest-project' })

      expect(projectsStore.projects[0].name).toBe('newest-project')
      expect(projectsStore.projects[0].id).toBe('newest-project')
    })

    it('increments totalCount on successful creation', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({ name: 'counter-project' }),
      })

      const { projectsStore } = await import('@/store/projects')
      projectsStore.pagination.totalCount = 5
      await projectsStore.createProject({ name: 'counter-project' })

      expect(projectsStore.pagination.totalCount).toBe(6)
    })

    it('returns the created project with id set to name', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({ name: 'returned-project', description: 'desc' }),
      })

      const { projectsStore } = await import('@/store/projects')
      const result = await projectsStore.createProject({ name: 'returned-project' })

      expect(result.id).toBe('returned-project')
      expect(result.name).toBe('returned-project')
    })

    it('sets loading to false and throws on API error', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      const { projectsStore } = await import('@/store/projects')
      await expect(projectsStore.createProject({ name: 'fail-project' })).rejects.toThrow(
        'Server error'
      )
      expect(projectsStore.loading).toBe(false)
    })
  })

  describe('updateProject', () => {
    it('patches to the correct endpoint with updated data', async () => {
      const updateData = { name: 'updated-name', description: 'Updated description' }
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'updated-name', description: 'Updated description' }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateProject('my-project', updateData)

      expect(mockPatch).toHaveBeenCalledWith(
        'v1/projects/my-project',
        {
          name: 'updated-name',
          display_name: undefined,
          clear_display_name: undefined,
          description: 'Updated description',
          cost_center_id: undefined,
          clear_cost_center: undefined,
          enforce_member_spend_limits: undefined,
        },
        { skipErrorHandling: true }
      )
    })

    it('includes display_name in the update payload', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'my-project', display_name: 'My Project' }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateProject('my-project', {
        name: 'my-project',
        display_name: 'My Project',
      })

      expect(mockPatch).toHaveBeenCalledWith(
        'v1/projects/my-project',
        expect.objectContaining({ display_name: 'My Project' }),
        { skipErrorHandling: true }
      )
    })

    it('sends clear_display_name and omits display_name when clearing (EPMCDME-13486)', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'my-project', display_name: null }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateProject('my-project', {
        name: 'my-project',
        display_name: null,
        clear_display_name: true,
      })

      expect(mockPatch).toHaveBeenCalledWith(
        'v1/projects/my-project',
        expect.objectContaining({ display_name: undefined, clear_display_name: true }),
        { skipErrorHandling: true }
      )
    })

    it('passes budget tracking flag in update payload', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({
          name: 'my-project',
          enforce_member_spend_limits: true,
        }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateProject('my-project', {
        enforce_member_spend_limits: true,
      })

      expect(mockPatch).toHaveBeenCalledWith(
        'v1/projects/my-project',
        {
          name: undefined,
          display_name: undefined,
          clear_display_name: undefined,
          description: undefined,
          cost_center_id: undefined,
          clear_cost_center: undefined,
          enforce_member_spend_limits: true,
        },
        { skipErrorHandling: true }
      )
    })

    it('updates the matching project in the projects array', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'my-project', description: 'New description' }),
      })

      const { projectsStore } = await import('@/store/projects')
      projectsStore.projects = [
        { id: 'my-project', name: 'my-project', description: 'Old description' },
        { id: 'other-project', name: 'other-project' },
      ]
      await projectsStore.updateProject('my-project', {
        name: 'my-project',
        description: 'New description',
      })

      expect(projectsStore.projects[0].description).toBe('New description')
      expect(projectsStore.projects[1].name).toBe('other-project')
    })

    it('URL-encodes project id for special characters', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'project with spaces' }),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateProject('project with spaces', { name: 'project with spaces' })

      const url = mockPatch.mock.calls[0][0] as string
      expect(url).toContain('project%20with%20spaces')
    })

    it('returns the updated project with id set to name', async () => {
      mockPatch.mockResolvedValue({
        json: async () => ({ name: 'renamed-project', description: 'Updated' }),
      })

      const { projectsStore } = await import('@/store/projects')
      projectsStore.projects = [{ id: 'old-name', name: 'old-name' }]
      const result = await projectsStore.updateProject('old-name', { name: 'renamed-project' })

      expect(result.id).toBe('renamed-project')
    })

    it('sets loading to false and throws on API error', async () => {
      mockPatch.mockRejectedValue(new Error('Update failed'))

      const { projectsStore } = await import('@/store/projects')
      await expect(
        projectsStore.updateProject('my-project', { name: 'my-project' })
      ).rejects.toThrow('Update failed')
      expect(projectsStore.loading).toBe(false)
    })
  })

  describe('deleteProject', () => {
    it('deletes to the correct endpoint', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.deleteProject('project-to-delete')

      expect(mockDelete).toHaveBeenCalledWith('v1/projects/project-to-delete')
    })

    it('removes the deleted project from the projects array', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      projectsStore.projects = [
        { id: 'project-to-delete', name: 'project-to-delete' },
        { id: 'keep-this', name: 'keep-this' },
      ]
      await projectsStore.deleteProject('project-to-delete')

      expect(projectsStore.projects).toHaveLength(1)
      expect(projectsStore.projects[0].id).toBe('keep-this')
    })

    it('decrements totalCount on successful deletion', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      projectsStore.projects = [{ id: 'delete-me', name: 'delete-me' }]
      projectsStore.pagination.totalCount = 3
      await projectsStore.deleteProject('delete-me')

      expect(projectsStore.pagination.totalCount).toBe(2)
    })

    it('sets error and throws on API error', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'))

      const { projectsStore } = await import('@/store/projects')
      await expect(projectsStore.deleteProject('my-project')).rejects.toThrow('Delete failed')
      expect(projectsStore.error).toContain('Failed to delete project')
    })

    it('sets loading to false after error', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'))

      const { projectsStore } = await import('@/store/projects')
      try {
        await projectsStore.deleteProject('my-project')
      } catch {
        // expected
      }
      expect(projectsStore.loading).toBe(false)
    })
  })

  describe('assignUserToProject', () => {
    it('posts to the correct assignment endpoint', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({}),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.assignUserToProject('my-project', 'user-123', true)

      expect(mockPost).toHaveBeenCalledWith('v1/projects/my-project/assignment', {
        user_id: 'user-123',
        is_admin: true,
      })
    })

    it('URL-encodes project name in assignment endpoint', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({}),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.assignUserToProject('project with spaces', 'user-123', false)

      const url = mockPost.mock.calls[0][0] as string
      expect(url).toContain('project%20with%20spaces')
    })

    it('sends is_admin false for non-admin assignment', async () => {
      mockPost.mockResolvedValue({
        json: async () => ({}),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.assignUserToProject('my-project', 'user-456', false)

      expect(mockPost).toHaveBeenCalledWith(expect.any(String), {
        user_id: 'user-456',
        is_admin: false,
      })
    })

    it('sets error and throws on API error', async () => {
      mockPost.mockRejectedValue(new Error('Assignment failed'))

      const { projectsStore } = await import('@/store/projects')
      await expect(
        projectsStore.assignUserToProject('my-project', 'user-123', false)
      ).rejects.toThrow('Assignment failed')
      expect(projectsStore.error).toContain('Failed to assign user to project')
    })
  })

  describe('updateUserProjectAssignment', () => {
    it('puts to the correct user assignment endpoint', async () => {
      mockPut.mockResolvedValue({
        json: async () => ({}),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateUserProjectAssignment('my-project', 'user-123', true)

      expect(mockPut).toHaveBeenCalledWith('v1/projects/my-project/assignment/user-123', {
        is_admin: true,
      })
    })

    it('sends is_admin true for promotion to admin', async () => {
      mockPut.mockResolvedValue({
        json: async () => ({}),
      })

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.updateUserProjectAssignment('my-project', 'user-123', true)

      expect(mockPut).toHaveBeenCalledWith(expect.any(String), { is_admin: true })
    })

    it('sets error and throws on API error', async () => {
      mockPut.mockRejectedValue(new Error('Update assignment failed'))

      const { projectsStore } = await import('@/store/projects')
      await expect(
        projectsStore.updateUserProjectAssignment('my-project', 'user-123', false)
      ).rejects.toThrow('Update assignment failed')
      expect(projectsStore.error).toContain('Failed to update user assignment')
    })
  })

  describe('removeUserFromProject', () => {
    it('deletes to the correct user assignment endpoint', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.removeUserFromProject('my-project', 'user-123')

      expect(mockDelete).toHaveBeenCalledWith('v1/projects/my-project/assignment/user-123')
    })

    it('URL-encodes both project name and user id', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.removeUserFromProject('my project', 'user@example.com')

      const url = mockDelete.mock.calls[0][0] as string
      expect(url).toContain('my%20project')
      expect(url).toContain('user%40example.com')
    })

    it('sets error and throws on API error', async () => {
      mockDelete.mockRejectedValue(new Error('Remove failed'))

      const { projectsStore } = await import('@/store/projects')
      await expect(projectsStore.removeUserFromProject('my-project', 'user-123')).rejects.toThrow(
        'Remove failed'
      )
      expect(projectsStore.error).toContain('Failed to remove user from project')
    })

    it('sets loading to false after successful removal', async () => {
      mockDelete.mockResolvedValue(undefined)

      const { projectsStore } = await import('@/store/projects')
      await projectsStore.removeUserFromProject('my-project', 'user-123')

      expect(projectsStore.loading).toBe(false)
    })
  })
})
