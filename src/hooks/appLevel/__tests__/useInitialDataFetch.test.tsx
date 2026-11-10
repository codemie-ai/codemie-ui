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

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useInitialDataFetch from '../useInitialDataFetch'

const boundary = vi.hoisted(() => {
  const resolved = () => vi.fn(async () => undefined)
  const calls: string[] = []
  return {
    calls,
    user: { userId: 'u-1' } as { userId: string } | null,
    loadUser: vi.fn(),
    hosted: {
      followUser: vi.fn((userId: string) => calls.push('followUser:' + userId)),
      ensureCapabilities: vi.fn(async () => {
        calls.push('ensureCapabilities')
      }),
    },
    fetchPreferences: vi.fn(async () => {
      calls.push('fetchPreferences')
    }),
    resolved,
  }
})

vi.mock('@/store', () => ({
  userStore: {
    get user() {
      return boundary.user
    },
    loadUser: boundary.loadUser,
  },
  assistantsStore: {
    fetchPinnedAssistants: boundary.resolved(),
    loadShowNewAssistantAIPopup: vi.fn(),
    getAssistantCategories: vi.fn(),
    getDefaultAssistant: vi.fn(),
    getHelpAssistants: vi.fn(),
  },
  chatsStore: {
    getFolders: boundary.resolved(),
    getAssistantFolders: boundary.resolved(),
    getChats: boundary.resolved(),
  },
}))
vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    configs: [],
    fetchCustomerConfig: boundary.resolved(),
    loadAppInfo: vi.fn(),
    fetchToolConfigs: vi.fn(),
    getLLMModels: vi.fn(),
    getEmbeddingsModels: vi.fn(),
    setIsNavigationExpanded: vi.fn(),
    setIsSidebarExpanded: vi.fn(),
  },
}))
vi.mock('@/store/applications', () => ({ applicationsStore: { fetchApplications: vi.fn() } }))
vi.mock('@/store/hostedApplications', () => ({ hostedApplicationsStore: boundary.hosted }))
vi.mock('@/store/preferences', () => ({
  preferencesStore: { fetchPreferences: boundary.fetchPreferences },
}))
vi.mock('@/store/skills', () => ({ skillsStore: { getSkillCategories: vi.fn() } }))
vi.mock('@/store/userProfileSettings', () => ({
  profileSettingsStore: { fetchProfileSettings: boundary.resolved() },
}))

describe('useInitialDataFetch hosted applications wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    boundary.calls.length = 0
    boundary.user = { userId: 'u-1' }
    boundary.loadUser.mockResolvedValue(undefined)
  })

  it('follows the signed-in person before loading their data, then loads the capabilities', async () => {
    renderHook(useInitialDataFetch)
    await waitFor(() => expect(boundary.hosted.ensureCapabilities).toHaveBeenCalledTimes(1))
    expect(boundary.hosted.followUser).toHaveBeenCalledExactlyOnceWith('u-1')
    expect(boundary.calls.indexOf('followUser:u-1')).toBeLessThan(
      boundary.calls.indexOf('fetchPreferences')
    )
  })

  it('follows another person who signs in, so their hosted state starts over', async () => {
    const first = renderHook(useInitialDataFetch)
    await waitFor(() => expect(boundary.hosted.ensureCapabilities).toHaveBeenCalledTimes(1))
    first.unmount()
    boundary.user = { userId: 'u-2' }
    renderHook(useInitialDataFetch)
    await waitFor(() => expect(boundary.hosted.ensureCapabilities).toHaveBeenCalledTimes(2))
    expect(boundary.hosted.followUser.mock.calls).toEqual([['u-1'], ['u-2']])
  })

  it('does not touch hosted applications when the session is not signed in', async () => {
    boundary.loadUser.mockRejectedValue(new Response(null, { status: 401 }))
    renderHook(useInitialDataFetch)
    await waitFor(() => expect(boundary.loadUser).toHaveBeenCalled())
    await Promise.resolve()
    expect(boundary.hosted.followUser).not.toHaveBeenCalled()
    expect(boundary.hosted.ensureCapabilities).not.toHaveBeenCalled()
  })
})
