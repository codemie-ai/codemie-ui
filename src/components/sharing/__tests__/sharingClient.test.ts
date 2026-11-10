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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

import { bindSharing, createSharingClient, type SharingClient } from '../sharingClient'

const json = (body: unknown) => ({ json: async () => body } as unknown as Response)

const alice = { id: 'u-1', name: 'Alice', email: 'alice@test.com' }
const me = { id: 'me', name: 'Me', email: 'me@test.com' }

describe('createSharingClient', () => {
  const client = createSharingClient('v1/things')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads who the item is shared with and unwraps { shared_with }', async () => {
    vi.mocked(api.get).mockResolvedValue(json({ shared_with: [alice] }))
    expect(await client.loadSharedWith('t-1')).toEqual([alice])
    expect(api.get).toHaveBeenCalledWith('v1/things/t-1/shared-with', { skipErrorHandling: true })
  })

  it('tolerates a flat array for who the item is shared with', async () => {
    vi.mocked(api.get).mockResolvedValue(json([alice]))
    expect(await client.loadSharedWith('t-1')).toEqual([alice])
  })

  it('searches sharable users by query and unwraps { users }', async () => {
    const { signal } = new AbortController()
    vi.mocked(api.get).mockResolvedValue(json({ users: [alice] }))
    expect(await client.searchUsers('t-1', 'a b', signal)).toEqual([alice])
    expect(api.get).toHaveBeenCalledWith('v1/things/t-1/sharable-users', {
      params: { q: 'a b' },
      signal,
      skipErrorHandling: true,
    })
  })

  it('shares and unshares by user ids', async () => {
    await client.share('t-1', ['u-1'])
    await client.unshare('t-1', ['u-1'])
    expect(api.post).toHaveBeenCalledWith(
      'v1/things/t-1/share',
      { user_ids: ['u-1'] },
      { skipErrorHandling: true }
    )
    expect(api.delete).toHaveBeenCalledWith(
      'v1/things/t-1/share',
      { user_ids: ['u-1'] },
      { skipErrorHandling: true }
    )
  })

  it('propagates request failures', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))
    await expect(client.searchUsers('t-1', 'ab')).rejects.toThrow('network error')
  })

  it('builds item paths with a function and rejects when it refuses the id', async () => {
    const custom = createSharingClient((id) => {
      if (id === 'bad') throw new Error('Invalid identifier')
      return `v2/items/${id}`
    })
    vi.mocked(api.post).mockResolvedValue(json({}))
    await custom.share('t-1', ['u-1'])
    expect(vi.mocked(api.post).mock.calls[0][0]).toBe('v2/items/t-1/share')
    await expect(custom.loadSharedWith('bad')).rejects.toThrow('Invalid identifier')
  })

  it('runs every request through the guard', async () => {
    const calls = vi.fn()
    const guard = <T>(run: () => Promise<T>) => {
      calls()
      return run()
    }
    const guarded = createSharingClient('v1/things', { guard })
    vi.mocked(api.get).mockResolvedValue(json([]))
    await guarded.loadSharedWith('t-1')
    await guarded.searchUsers('t-1', 'ab')
    await guarded.share('t-1', ['u-1'])
    await guarded.unshare('t-1', ['u-1'])
    expect(calls).toHaveBeenCalledTimes(4)
  })
})

describe('bindSharing', () => {
  const client: SharingClient = {
    loadSharedWith: vi.fn(),
    searchUsers: vi.fn(),
    share: vi.fn(),
    unshare: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('leaves the current user out of search results and the people with access', async () => {
    vi.mocked(client.searchUsers).mockResolvedValue([me, alice])
    vi.mocked(client.loadSharedWith).mockResolvedValue([me, alice])
    const bound = bindSharing(client, 't-1', 'me')
    expect(await bound.searchUsers('al')).toEqual([alice])
    expect(await bound.loadSharedWith()).toEqual([alice])
    expect(client.searchUsers).toHaveBeenCalledWith('t-1', 'al')
    expect(client.loadSharedWith).toHaveBeenCalledWith('t-1')
  })

  it('keeps everyone when the current user is unknown', async () => {
    vi.mocked(client.loadSharedWith).mockResolvedValue([me, alice])
    expect(await bindSharing(client, 't-1', undefined).loadSharedWith()).toEqual([me, alice])
  })

  it('binds share and unshare to the item', async () => {
    const bound = bindSharing(client, 't-1', 'me')
    await bound.share(['u-1'])
    await bound.unshare(['u-1'])
    expect(client.share).toHaveBeenCalledWith('t-1', ['u-1'])
    expect(client.unshare).toHaveBeenCalledWith('t-1', ['u-1'])
  })
})
