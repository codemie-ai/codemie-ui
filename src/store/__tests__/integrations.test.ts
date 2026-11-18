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

import {
  editRouteName,
  integrationsStore,
  matchesSavedRow,
  SavedRowKey,
} from '@/store/integrations'
import { userSettingsStore } from '@/store/userSettings'
import { Setting } from '@/types/entity/setting'
import api from '@/utils/api'
import { IntegrationScope } from '@/utils/integrationScope'

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
const mockDelete = api.delete as unknown as ReturnType<typeof vi.fn>

const okResponse = (data: unknown) => ({ json: async () => data })
const envelope = (rows: unknown[], total: number) =>
  okResponse({ data: rows, pagination: { page: 0, per_page: 10, pages: 1, total } })

const row = (over: Partial<Setting> = {}) =>
  ({
    id: 'a',
    setting_type: 'user',
    project_name: 'p',
    credential_type: 'Jira',
    alias: 'x',
    ...over,
  } as Setting)

describe('integrationsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    integrationsStore.settings = []
    userSettingsStore.isSettingsIndexed = true
    integrationsStore.takeSavedRow()
  })

  describe('fetchSettings', () => {
    it('requests v1/settings with scope, zero-based page, per_page and JSON filters', async () => {
      mockGet.mockResolvedValue(envelope([row()], 1))
      await integrationsStore.fetchSettings({
        scope: 'all',
        filters: { alias: 'x' },
        page: 0,
        perPage: 10,
      })
      expect(mockGet).toHaveBeenCalledWith(
        `v1/settings?scope=all&page=0&per_page=10&filters=${encodeURIComponent('{"alias":"x"}')}`
      )
    })

    it('maps rows and pagination', async () => {
      mockGet.mockResolvedValue(
        okResponse({
          data: [row()],
          pagination: { page: 2, per_page: 25, pages: 4, total: 90 },
        })
      )
      await integrationsStore.fetchSettings({ scope: 'user', filters: {}, page: 2, perPage: 25 })
      expect(integrationsStore.settings).toHaveLength(1)
      expect(integrationsStore.pagination).toEqual({
        page: 2,
        perPage: 25,
        totalPages: 4,
        totalCount: 90,
      })
      expect(integrationsStore.loading).toBe(false)
    })

    it('keeps the latest response when the first request resolves last', async () => {
      let resolveFirst: (v: unknown) => void = () => {}
      mockGet
        .mockReturnValueOnce(
          new Promise((r) => {
            resolveFirst = r
          })
        )
        .mockResolvedValueOnce(envelope([row({ id: 'second' })], 7))

      const first = integrationsStore.fetchSettings({
        scope: 'all',
        filters: {},
        page: 0,
        perPage: 10,
      })
      await integrationsStore.fetchSettings({ scope: 'all', filters: {}, page: 0, perPage: 10 })
      resolveFirst(envelope([row({ id: 'first' })], 99))
      await first

      expect(integrationsStore.settings.map((s) => s.id)).toEqual(['second'])
      expect(integrationsStore.pagination.totalCount).toBe(7)
      expect(integrationsStore.loading).toBe(false)
    })
  })

  describe('scope dispatch', () => {
    it('deleteSetting(user) hits the user endpoint and resets the index flag', async () => {
      mockDelete.mockResolvedValue(okResponse({ ok: true }))
      const result = await integrationsStore.deleteSetting('user', 'u1')
      expect(mockDelete).toHaveBeenCalledWith('v1/settings/user/u1')
      expect(result).toEqual({ ok: true })
      expect(userSettingsStore.isSettingsIndexed).toBe(false)
    })

    it('deleteSetting(project) hits the project endpoint', async () => {
      mockDelete.mockResolvedValue(okResponse({}))
      await integrationsStore.deleteSetting('project', 'p1')
      expect(mockDelete).toHaveBeenCalledWith('v1/settings/project/p1')
    })

    it('createSetting and updateSetting dispatch by scope', async () => {
      mockPost.mockResolvedValue(okResponse({}))
      mockPut.mockResolvedValue(okResponse({}))
      await integrationsStore.createSetting('project', { a: 1 })
      await integrationsStore.updateSetting('user', 'u1', { b: 2 })
      expect(mockPost.mock.calls[0][0]).toBe('v1/settings/project')
      expect(mockPut.mock.calls[0][0]).toBe('v1/settings/user/u1')
    })
  })

  describe('saved row hand-off', () => {
    it('takeSavedRow returns the key once, then null', () => {
      const key: SavedRowKey = {
        scope: IntegrationScope.USER,
        project_name: 'p',
        credential_type: 'Jira',
        alias: 'x',
      }
      integrationsStore.setSavedRow(key)
      expect(integrationsStore.takeSavedRow()).toEqual(key)
      expect(integrationsStore.takeSavedRow()).toBeNull()
    })
  })
})

describe('matchesSavedRow', () => {
  const key: SavedRowKey = {
    scope: IntegrationScope.USER,
    project_name: 'p',
    credential_type: 'Jira',
    alias: 'x',
  }

  it('matches on setting_type and the three fields, ignoring id', () => {
    expect(matchesSavedRow(row({ id: 'other' }), key)).toBe(true)
  })

  it.each([
    ['setting_type', { setting_type: 'project' }],
    ['project_name', { project_name: 'q' }],
    ['credential_type', { credential_type: 'Git' }],
    ['alias', { alias: 'y' }],
  ])('does not match when %s differs', (_n, over) => {
    expect(matchesSavedRow(row(over as Partial<Setting>), key)).toBe(false)
  })
})

describe('editRouteName', () => {
  it('maps scope to the edit route', () => {
    expect(editRouteName('user')).toBe('edit-user-integration')
    expect(editRouteName('project')).toBe('edit-project-integration')
  })
})
