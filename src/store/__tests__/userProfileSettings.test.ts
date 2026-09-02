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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

import { profileSettingsStore } from '../userProfileSettings'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  profileSettingsStore.profileSettings = null
  profileSettingsStore.error = null
})

describe('fetchProfileSettings', () => {
  it('fetches and stores profile settings on success', async () => {
    const profile = {
      user_id: 'user-123',
      onboarding: { completed: true, completed_flows: ['nav'], visited_pages: ['chat'] },
      recent_assistant_ids: ['a1'],
      last_viewed_release_version: '1.0.0',
    }
    mockApi.get.mockResolvedValueOnce({ json: () => Promise.resolve(profile) })

    await profileSettingsStore.fetchProfileSettings('user-123')

    expect(mockApi.get).toHaveBeenCalledWith('v1/user/profile-settings/user-123', {
      skipErrorHandling: true,
    })
    expect(profileSettingsStore.profileSettings).toEqual(profile)
  })

  it('calls PUT with defaults on 404 when localStorage is empty', async () => {
    const notFoundError = { status: 404 }
    mockApi.get.mockRejectedValueOnce(notFoundError)
    const defaults = {
      user_id: 'user-123',
      onboarding: { completed: false, completed_flows: [], visited_pages: [] },
      recent_assistant_ids: [],
      last_viewed_release_version: null,
    }
    mockApi.put.mockResolvedValueOnce({ json: () => Promise.resolve(defaults) })

    await profileSettingsStore.fetchProfileSettings('user-123')

    expect(mockApi.put).toHaveBeenCalledWith('v1/user/profile-settings/user-123', defaults)
  })

  it('migrates onboarding flows and visited pages from localStorage on 404', async () => {
    localStorage.setItem('codemie-onboarding-completed', 'true')
    localStorage.setItem(
      'user-123_onboarding-completed-flows',
      JSON.stringify(['flow-1', 'flow-2'])
    )
    localStorage.setItem('user-123_onboarding-visited-pages', JSON.stringify(['page-a']))
    mockApi.get.mockRejectedValueOnce({ status: 404 })
    mockApi.put.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          user_id: 'user-123',
          onboarding: {
            completed: true,
            completed_flows: ['flow-1', 'flow-2'],
            visited_pages: ['page-a'],
          },
          recent_assistant_ids: [],
          last_viewed_release_version: null,
        }),
    })

    await profileSettingsStore.fetchProfileSettings('user-123')

    expect(mockApi.put).toHaveBeenCalledWith(
      'v1/user/profile-settings/user-123',
      expect.objectContaining({
        onboarding: {
          completed: true,
          completed_flows: ['flow-1', 'flow-2'],
          visited_pages: ['page-a'],
        },
      })
    )
  })

  it('migrates recent_assistant_ids from recentAssistants localStorage on 404', async () => {
    localStorage.setItem(
      'recentAssistants',
      JSON.stringify([
        { id: 'a1', name: 'Bot A' },
        { id: 'a2', name: 'Bot B' },
        { id: 'a3', name: 'Bot C' },
        { id: 'a4', name: 'Bot D' },
      ])
    )
    mockApi.get.mockRejectedValueOnce({ status: 404 })
    mockApi.put.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          user_id: 'user-123',
          onboarding: { completed: false, completed_flows: [], visited_pages: [] },
          recent_assistant_ids: ['a1', 'a2', 'a3'],
          last_viewed_release_version: null,
        }),
    })

    await profileSettingsStore.fetchProfileSettings('user-123')

    expect(mockApi.put).toHaveBeenCalledWith(
      'v1/user/profile-settings/user-123',
      expect.objectContaining({ recent_assistant_ids: ['a1', 'a2', 'a3'] })
    )
  })

  it('migrates last_viewed_release_version from localStorage on 404', async () => {
    localStorage.setItem('codemie-viewed-release-version', '2.5.0')
    mockApi.get.mockRejectedValueOnce({ status: 404 })
    mockApi.put.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          user_id: 'user-123',
          onboarding: { completed: false, completed_flows: [], visited_pages: [] },
          recent_assistant_ids: [],
          last_viewed_release_version: '2.5.0',
        }),
    })

    await profileSettingsStore.fetchProfileSettings('user-123')

    expect(mockApi.put).toHaveBeenCalledWith(
      'v1/user/profile-settings/user-123',
      expect.objectContaining({ last_viewed_release_version: '2.5.0' })
    )
  })
})

describe('saveProfileSettings', () => {
  it('calls PUT with the patch payload', async () => {
    const updated = {
      user_id: 'user-123',
      onboarding: { completed: true, completed_flows: ['nav'], visited_pages: [] },
      recent_assistant_ids: [],
      last_viewed_release_version: null,
    }
    mockApi.put.mockResolvedValueOnce({ json: () => Promise.resolve(updated) })

    await profileSettingsStore.saveProfileSettings('user-123', {
      onboarding: { completed: true, completed_flows: ['nav'], visited_pages: [] },
    })

    expect(mockApi.put).toHaveBeenCalledWith('v1/user/profile-settings/user-123', {
      onboarding: { completed: true, completed_flows: ['nav'], visited_pages: [] },
    })
    expect(profileSettingsStore.profileSettings?.onboarding.completed).toBe(true)
  })
})
