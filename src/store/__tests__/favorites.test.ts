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

import { favoritesStore } from '@/store/favorites'
import { ResourceType } from '@/types/entity/favorites'

const mocks = vi.hoisted(() => ({
  putPreferences: vi.fn(),
  preferencesStore: { preferences: null as unknown, putPreferences: vi.fn() },
  assistantsStore: { assistants: [] as unknown[] },
  skillsStore: { skills: [] as unknown[] },
  workflowsStore: { workflows: [] as unknown[] },
}))

vi.mock('@/utils/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/store/assistants', () => ({ assistantsStore: mocks.assistantsStore }))
vi.mock('@/store/preferences', () => ({ preferencesStore: mocks.preferencesStore }))
vi.mock('@/store/skills', () => ({ skillsStore: mocks.skillsStore }))
vi.mock('@/store/workflows', () => ({ workflowsStore: mocks.workflowsStore }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

describe('favoritesStore.addFavorite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.preferencesStore.putPreferences = mocks.putPreferences
    mocks.preferencesStore.preferences = {
      pinned_assistants: [],
      favorites: { assistants: ['a-0'], skills: [], workflows: [] },
    }
    mocks.assistantsStore.assistants = [{ id: 'a-1', name: 'One' }]
    mocks.skillsStore.skills = [{ id: 's-1', name: 'Skill' }]
  })

  it('PUTs the updated favorites and leaves stored assistants unchanged for an assistant', async () => {
    await favoritesStore.addFavorite(ResourceType.ASSISTANT, 'a-1')

    expect(mocks.putPreferences).toHaveBeenCalledWith('user-1', {
      favorites: { assistants: ['a-0', 'a-1'], skills: [], workflows: [] },
    })
    expect(mocks.assistantsStore.assistants).toEqual([{ id: 'a-1', name: 'One' }])
    expect(mocks.assistantsStore.assistants[0]).not.toHaveProperty('is_favorited')
  })

  it('still sets is_favorited on the skill for a skill', async () => {
    await favoritesStore.addFavorite(ResourceType.SKILL, 's-1')

    expect(mocks.skillsStore.skills[0]).toMatchObject({ id: 's-1', is_favorited: true })
  })
})
