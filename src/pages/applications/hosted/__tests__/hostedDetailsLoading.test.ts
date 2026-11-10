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

import { beforeEach, expect, it, vi } from 'vitest'

import { loadHostedDetails } from '../hostedDetailsLoading'

const boundary = vi.hoisted(() => ({
  store: { getApplication: vi.fn(), listVersionPage: vi.fn(), getVersion: vi.fn() },
}))
vi.mock('@/store/hostedApplications', () => ({ hostedApplicationsStore: boundary.store }))

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

beforeEach(() => {
  vi.clearAllMocks()
  boundary.store.listVersionPage.mockResolvedValue({ items: [{ id: 'r1' }], next_cursor: null })
})

it('does not list versions for a reader', async () => {
  boundary.store.getApplication.mockResolvedValue({ id: ID, user_abilities: ['read'] })
  const { signal } = new AbortController()
  const result = await loadHostedDetails(ID, signal)
  expect(boundary.store.listVersionPage).not.toHaveBeenCalled()
  expect(result.page).toEqual({ items: [], next_cursor: null })
  expect(result.versions).toEqual([])
})

it('lists versions for a manager', async () => {
  boundary.store.getApplication.mockResolvedValue({ id: ID, user_abilities: ['read', 'write'] })
  const { signal } = new AbortController()
  const result = await loadHostedDetails(ID, signal)
  expect(boundary.store.listVersionPage).toHaveBeenCalledWith(ID, undefined, signal)
  expect(result.versions).toEqual([{ id: 'r1' }])
})

it('keeps the details when one pinned version can no longer be read', async () => {
  boundary.store.getApplication.mockResolvedValue({
    id: ID,
    user_abilities: ['read'],
    active_version_id: 'v-active',
    selected_version_id: 'v-selected',
  })
  boundary.store.getVersion.mockImplementation(async (_id: string, versionId: string) => {
    if (versionId === 'v-active') throw Object.assign(new Error('Not found'), { status: 404 })
    return { id: versionId }
  })
  const { signal } = new AbortController()
  const result = await loadHostedDetails(ID, signal)
  expect(result.versions).toEqual([{ id: 'v-selected' }])
})

it('still fails when a pinned version cannot be loaded for another reason', async () => {
  boundary.store.getApplication.mockResolvedValue({
    id: ID,
    user_abilities: ['read'],
    active_version_id: 'v-active',
  })
  boundary.store.getVersion.mockRejectedValue(new Error('Disconnected'))
  const { signal } = new AbortController()
  await expect(loadHostedDetails(ID, signal)).rejects.toThrow('Disconnected')
})
