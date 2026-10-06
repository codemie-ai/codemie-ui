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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { projectsStore } from '@/store/projects'

import { getFilteredModelsForProject } from '../projectModelFiltering'

vi.mock('@/store/projects', () => ({
  projectsStore: {
    getProject: vi.fn(),
  },
}))

describe('projectModelFiltering', () => {
  const mockAllModels = [
    { value: 'gpt-4', label: 'GPT-4', isPremium: true },
    { value: 'gpt-3.5', label: 'GPT-3.5', isPremium: false },
    { value: 'claude-3', label: 'Claude 3', isPremium: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns all models when projectId is undefined', async () => {
    const result = await getFilteredModelsForProject(undefined, mockAllModels)
    expect(result).toEqual(mockAllModels)
  })

  it('returns all models when projectId is empty string', async () => {
    const result = await getFilteredModelsForProject('', mockAllModels)
    expect(result).toEqual(mockAllModels)
  })

  it('returns filtered models when project has allowed_models restrictions', async () => {
    const mockProject = {
      name: 'zoo',
      allowed_models: ['gpt-4', 'claude-3'],
      default_model: 'gpt-4',
    }
    ;(projectsStore.getProject as any).mockResolvedValue(mockProject)

    const result = await getFilteredModelsForProject('zoo', mockAllModels)
    expect(result.length).toBeLessThanOrEqual(mockAllModels.length)
    expect(result.every((m) => ['gpt-4', 'claude-3'].includes(m.value))).toBe(true)
    expect(result.length).toBe(2)
  })

  it('returns all models when project has no allowed_models restriction', async () => {
    const mockProject = {
      name: 'project-no-restriction',
      allowed_models: null,
    }
    ;(projectsStore.getProject as any).mockResolvedValue(mockProject)

    const result = await getFilteredModelsForProject('project-no-restriction', mockAllModels)
    expect(result).toEqual(mockAllModels)
  })

  it('returns all models when project config has empty allowed_models', async () => {
    const mockProject = {
      name: 'project-empty',
      allowed_models: [],
    }
    ;(projectsStore.getProject as any).mockResolvedValue(mockProject)

    const result = await getFilteredModelsForProject('project-empty', mockAllModels)
    expect(result).toEqual(mockAllModels)
  })

  it('filters correctly with single enabled model', async () => {
    const mockProject = {
      name: 'project1',
      allowed_models: ['gpt-4'],
      default_model: 'gpt-4',
    }
    ;(projectsStore.getProject as any).mockResolvedValue(mockProject)

    const result = await getFilteredModelsForProject('project1', mockAllModels)
    expect(result.length).toBe(1)
    expect(result[0].value).toBe('gpt-4')
  })

  it('filters correctly with multiple enabled models', async () => {
    const mockProject = {
      name: 'project2',
      allowed_models: ['gpt-3.5', 'claude-3'],
      default_model: 'gpt-3.5',
    }
    ;(projectsStore.getProject as any).mockResolvedValue(mockProject)

    const result = await getFilteredModelsForProject('project2', mockAllModels)
    expect(result.length).toBe(2)
    expect(result.map((m) => m.value).sort()).toEqual(['claude-3', 'gpt-3.5'])
  })

  it('returns all models when project fetch fails', async () => {
    ;(projectsStore.getProject as any).mockRejectedValue(new Error('Network error'))

    const result = await getFilteredModelsForProject('project-error', mockAllModels)
    expect(result).toEqual(mockAllModels)
  })
})
