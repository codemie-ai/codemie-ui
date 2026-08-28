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

import { userSettingsStore } from '@/store/userSettings'
import api from '@/utils/api'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockGet = api.get as unknown as ReturnType<typeof vi.fn>
const mockPost = api.post as unknown as ReturnType<typeof vi.fn>
const mockPut = api.put as unknown as ReturnType<typeof vi.fn>

const okResponse = (data: unknown) => ({ json: async () => data })

const sampleSetting = {
  id: 's-1',
  alias: 'my jira',
  credential_type: 'Jira',
  setting_type: 'user',
  project_name: 'proj-a',
}

describe('userSettingsStore.indexSettings — scope-aware cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the shared singleton state between tests.
    userSettingsStore.isSettingsIndexed = false
    userSettingsStore.indexedMarketplace = false
    userSettingsStore.settings = {}
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the plain endpoint for project-shared and the marketplace scope for marketplace', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available')

    // Switching scope must re-fetch (project-shared -> marketplace).
    await userSettingsStore.indexSettings(true)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available?scope=marketplace')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('re-fetches when the scope switches from marketplace back to project-shared', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(true)
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(mockGet).toHaveBeenLastCalledWith('v1/settings/user/available')
  })

  it('short-circuits a repeated same-scope call without an extra request', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('groups fetched settings by lower-cased credential_type', async () => {
    mockGet.mockResolvedValue(okResponse([sampleSetting]))

    await userSettingsStore.indexSettings(false)

    expect(userSettingsStore.settings).toEqual({ jira: [sampleSetting] })
  })

  it('does NOT mark the cache indexed when the fetch fails, so the next call re-fetches', async () => {
    mockGet.mockRejectedValueOnce(new Error('network down'))

    await expect(userSettingsStore.indexSettings(false)).rejects.toThrow('network down')

    // The failed fetch must not have flagged the cache as populated.
    expect(userSettingsStore.isSettingsIndexed).toBe(false)
    expect(userSettingsStore.settings).toEqual({})

    // A subsequent call honestly re-fetches instead of short-circuiting on stale/empty settings.
    mockGet.mockResolvedValue(okResponse([sampleSetting]))
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(userSettingsStore.isSettingsIndexed).toBe(true)
    expect(userSettingsStore.settings).toEqual({ jira: [sampleSetting] })
  })
})

describe('userSettingsStore mutations — invalidate the scope-aware cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userSettingsStore.isSettingsIndexed = false
    userSettingsStore.indexedMarketplace = false
    userSettingsStore.settings = {}
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('createUserSetting re-fetches on the next indexSettings so a new integration is not hidden by the cache', async () => {
    // First index populates and caches the (empty) option set.
    mockGet.mockResolvedValueOnce(okResponse([]))
    await userSettingsStore.indexSettings(false)
    expect(userSettingsStore.isSettingsIndexed).toBe(true)

    // Creating an integration must invalidate the cache...
    mockPost.mockResolvedValueOnce(okResponse(sampleSetting))
    await userSettingsStore.createUserSetting({ alias: 'my jira', credential_type: 'Jira' })
    expect(userSettingsStore.isSettingsIndexed).toBe(false)

    // ...so the next indexSettings honestly re-fetches instead of short-circuiting, and the new
    // integration shows up without a page reload.
    mockGet.mockResolvedValueOnce(okResponse([sampleSetting]))
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(userSettingsStore.settings).toEqual({ jira: [sampleSetting] })
  })

  it('updateUserSetting re-fetches on the next indexSettings so a scope change (e.g. is_global) is reflected without a reload', async () => {
    // Cache the current option set.
    mockGet.mockResolvedValueOnce(okResponse([sampleSetting]))
    await userSettingsStore.indexSettings(false)
    expect(userSettingsStore.isSettingsIndexed).toBe(true)

    // Editing an integration (e.g. flipping is_global on the integrations page) must invalidate the
    // scope-aware cache...
    mockPut.mockResolvedValueOnce(okResponse({ ...sampleSetting, is_global: true }))
    await userSettingsStore.updateUserSetting(sampleSetting.id, { is_global: true })
    expect(userSettingsStore.isSettingsIndexed).toBe(false)

    // ...so the assistant User Mapping dropdown re-fetches the updated list instead of showing the
    // stale, pre-edit options.
    mockGet.mockResolvedValueOnce(okResponse([{ ...sampleSetting, is_global: true }]))
    await userSettingsStore.indexSettings(false)

    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})

describe('userSettingsStore — per-user GitLab connect', () => {
  const mockDelete = api.delete as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connectGitLabOAuth posts setting_id and returns the initiate payload', async () => {
    mockPost.mockResolvedValueOnce(
      okResponse({
        auth_url: 'https://gl/auth',
        state: 'st',
        instance_url: 'https://gl',
        setting_id: 's1',
      })
    )
    const res = await userSettingsStore.connectGitLabOAuth('s1')
    expect(mockPost).toHaveBeenCalledWith('v1/gitlab-oauth/connect', { setting_id: 's1' })
    expect(res.state).toBe('st')
    expect(res.setting_id).toBe('s1')
  })

  it('getGitLabConnectionStatus reads the caller status', async () => {
    mockGet.mockResolvedValueOnce({
      ok: true,
      ...okResponse({ status: 'connected', username: 'groot' }),
    })
    const res = await userSettingsStore.getGitLabConnectionStatus('s1')
    expect(mockGet).toHaveBeenCalledWith('v1/gitlab-oauth/connection?setting_id=s1', {
      skipErrorHandling: true,
    })
    expect(res).toEqual({ status: 'connected', username: 'groot' })
  })

  it('getGitLabConnectionStatus falls back to not_connected on a failed response', async () => {
    mockGet.mockResolvedValueOnce({ ok: false })
    const res = await userSettingsStore.getGitLabConnectionStatus('s1')
    expect(res).toEqual({ status: 'not_connected', username: '' })
  })

  it('disconnectGitLabOAuth deletes the caller row', async () => {
    mockDelete.mockResolvedValueOnce(okResponse({ status: 'disconnected' }))
    await userSettingsStore.disconnectGitLabOAuth('s1')
    expect(mockDelete).toHaveBeenCalledWith('v1/gitlab-oauth/connection?setting_id=s1')
  })
})

describe('userSettingsStore — per-user Jira connect', () => {
  const mockDelete = api.delete as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connectJiraOAuth posts setting_id and returns the initiate payload', async () => {
    mockPost.mockResolvedValueOnce(
      okResponse({ auth_url: 'https://a', state: 'st', setting_id: 's1' })
    )
    const res = await userSettingsStore.connectJiraOAuth('s1')
    expect(mockPost).toHaveBeenCalledWith('v1/atlassian-oauth/connect', { setting_id: 's1' })
    expect(res.state).toBe('st')
    expect(res.setting_id).toBe('s1')
  })

  it('getJiraConnectionStatus reads the caller status', async () => {
    mockGet.mockResolvedValueOnce({
      ok: true,
      ...okResponse({ status: 'connected', username: 'groot' }),
    })
    const res = await userSettingsStore.getJiraConnectionStatus('s1')
    expect(mockGet).toHaveBeenCalledWith('v1/atlassian-oauth/connection?setting_id=s1', {
      skipErrorHandling: true,
    })
    expect(res).toEqual({ status: 'connected', username: 'groot' })
  })

  it('getJiraConnectionStatus falls back to not_connected on a failed response', async () => {
    mockGet.mockResolvedValueOnce({ ok: false })
    const res = await userSettingsStore.getJiraConnectionStatus('s1')
    expect(res).toEqual({ status: 'not_connected', username: '' })
  })

  it('disconnectJiraOAuth deletes the caller row', async () => {
    mockDelete.mockResolvedValueOnce(okResponse({ status: 'disconnected' }))
    await userSettingsStore.disconnectJiraOAuth('s1')
    expect(mockDelete).toHaveBeenCalledWith('v1/atlassian-oauth/connection?setting_id=s1')
  })
})

describe('userSettingsStore — per-user Confluence connect', () => {
  const mockDelete = api.delete as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('connectConfluenceOAuth posts setting_id and returns the initiate payload', async () => {
    mockPost.mockResolvedValueOnce(
      okResponse({ auth_url: 'https://a', state: 'st', setting_id: 's1' })
    )
    const res = await userSettingsStore.connectConfluenceOAuth('s1')
    expect(mockPost).toHaveBeenCalledWith('v1/confluence-oauth/connect', { setting_id: 's1' })
    expect(res.state).toBe('st')
  })

  it('getConfluenceConnectionStatus reads the caller status', async () => {
    mockGet.mockResolvedValueOnce({
      ok: true,
      ...okResponse({ status: 'connected', username: 'groot' }),
    })
    const res = await userSettingsStore.getConfluenceConnectionStatus('s1')
    expect(mockGet).toHaveBeenCalledWith('v1/confluence-oauth/connection?setting_id=s1', {
      skipErrorHandling: true,
    })
    expect(res).toEqual({ status: 'connected', username: 'groot' })
  })

  it('disconnectConfluenceOAuth deletes the caller row', async () => {
    mockDelete.mockResolvedValueOnce(okResponse({ status: 'disconnected' }))
    await userSettingsStore.disconnectConfluenceOAuth('s1')
    expect(mockDelete).toHaveBeenCalledWith('v1/confluence-oauth/connection?setting_id=s1')
  })
})
