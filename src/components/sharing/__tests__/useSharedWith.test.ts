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

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSharedWith } from '../useSharedWith'

import type { SharingClient } from '../sharingClient'

const alice = { id: 'u-1', name: 'Alice', email: 'alice@test.com' }
const bob = { id: 'u-2', name: 'Bob', email: 'bob@test.com' }
const me = { id: 'me', name: 'Me', email: 'me@test.com' }

const client: SharingClient = {
  loadSharedWith: vi.fn(),
  searchUsers: vi.fn(),
  share: vi.fn(),
  unshare: vi.fn(),
}

describe('useSharedWith', () => {
  beforeEach(() => {
    vi.mocked(client.loadSharedWith).mockReset()
  })

  it('loads the people with access and leaves the current user out, as the share popup does', async () => {
    vi.mocked(client.loadSharedWith).mockResolvedValue([me, alice])
    const { result } = renderHook(() => useSharedWith(client, 'a-1', { currentUserId: 'me' }))
    expect(result.current).toMatchObject({ users: [], loaded: false, failed: false })
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.users).toEqual([alice])
    expect(client.loadSharedWith).toHaveBeenCalledWith('a-1')
  })

  it('does not ask while disabled or without an id', () => {
    const { result, rerender } = renderHook(
      ({ id, enabled }) => useSharedWith(client, id, { enabled }),
      { initialProps: { id: 'a-1' as string | undefined, enabled: false } }
    )
    rerender({ id: undefined, enabled: true })
    expect(client.loadSharedWith).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({ users: [], loaded: false, failed: false })
  })

  it('reports a failure and loads again on reload', async () => {
    vi.mocked(client.loadSharedWith)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([alice])
    const { result } = renderHook(() => useSharedWith(client, 'a-1'))
    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.users).toEqual([])
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current).toMatchObject({ users: [alice], failed: false })
  })

  it('keeps the list on screen while a reload is in flight', async () => {
    let answer: (users: (typeof alice)[]) => void = () => undefined
    const pending = new Promise<(typeof alice)[]>((resolve) => {
      answer = resolve
    })
    vi.mocked(client.loadSharedWith).mockResolvedValueOnce([alice]).mockReturnValueOnce(pending)
    const { result } = renderHook(() => useSharedWith(client, 'a-1'))
    await waitFor(() => expect(result.current.users).toEqual([alice]))
    act(() => result.current.reload())
    expect(result.current.users).toEqual([alice])
    await act(async () => answer([alice, bob]))
    expect(result.current.users).toEqual([alice, bob])
  })

  it('loads again when the reload key changes and never shows another item’s list', async () => {
    vi.mocked(client.loadSharedWith).mockResolvedValueOnce([alice]).mockResolvedValueOnce([bob])
    const { result, rerender } = renderHook(
      ({ id, key }) => useSharedWith(client, id, { reloadKey: key }),
      { initialProps: { id: 'a-1', key: 1 } }
    )
    await waitFor(() => expect(result.current.users).toEqual([alice]))
    rerender({ id: 'a-2', key: 1 })
    expect(result.current.users).toEqual([])
    await waitFor(() => expect(result.current.users).toEqual([bob]))
    vi.mocked(client.loadSharedWith).mockResolvedValueOnce([bob, alice])
    rerender({ id: 'a-2', key: 2 })
    await waitFor(() => expect(result.current.users).toEqual([bob, alice]))
    expect(client.loadSharedWith).toHaveBeenCalledTimes(3)
  })
})
