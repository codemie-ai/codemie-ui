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

import { moveOrderStore } from '../moveOrder'

vi.mock('valtio', () => ({ proxy: vi.fn((obj) => obj) }))

const mockStorage = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  getObject: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('@/utils/storage', () => ({ default: mockStorage }))

const mockUserStore = vi.hoisted(() => ({
  user: { userId: 'user-1' } as { userId: string } | null,
}))
vi.mock('@/store/user', () => ({ userStore: mockUserStore }))

beforeEach(() => {
  vi.clearAllMocks()
  mockUserStore.user = { userId: 'user-1' }
  mockStorage.getObject.mockReturnValue({})
})

describe('moveOrderStore', () => {
  it('getMoveOrder reads the per-user map from storage', () => {
    mockStorage.getObject.mockReturnValue({ 'chat-1': '2020-01-01T00:00:00.000Z' })

    expect(moveOrderStore.getMoveOrder()).toEqual({ 'chat-1': '2020-01-01T00:00:00.000Z' })
    expect(mockStorage.getObject).toHaveBeenCalledWith('user-1', 'moved_chats_order', {})
  })

  it('getMoveOrder returns an empty map when no user is signed in', () => {
    mockUserStore.user = null

    expect(moveOrderStore.getMoveOrder()).toEqual({})
    expect(mockStorage.getObject).not.toHaveBeenCalled()
  })

  it('recordMove sets an ISO timestamp for the chat and persists it', () => {
    mockStorage.getObject.mockReturnValue({})

    moveOrderStore.recordMove('chat-1')

    expect(mockStorage.put).toHaveBeenCalledTimes(1)
    const [userId, key, saved] = mockStorage.put.mock.calls[0]
    expect(userId).toBe('user-1')
    expect(key).toBe('moved_chats_order')
    expect(saved).toHaveProperty('chat-1')
    expect(typeof saved['chat-1']).toBe('string')
  })

  it('clearMove removes the chat entry and persists the result', () => {
    mockStorage.getObject.mockReturnValue({
      'chat-1': '2020-01-01T00:00:00.000Z',
      'chat-2': '2020-01-02T00:00:00.000Z',
    })

    moveOrderStore.clearMove('chat-1')

    expect(mockStorage.put).toHaveBeenCalledWith('user-1', 'moved_chats_order', {
      'chat-2': '2020-01-02T00:00:00.000Z',
    })
  })

  it('clearMove is a no-op when the chat has no entry', () => {
    mockStorage.getObject.mockReturnValue({ 'chat-2': '2020-01-02T00:00:00.000Z' })

    moveOrderStore.clearMove('chat-1')

    expect(mockStorage.put).not.toHaveBeenCalled()
  })

  it('does not throw when storage.getObject throws', () => {
    mockStorage.getObject.mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => moveOrderStore.getMoveOrder()).not.toThrow()
    expect(() => moveOrderStore.recordMove('chat-1')).not.toThrow()
    expect(() => moveOrderStore.clearMove('chat-1')).not.toThrow()
  })
})
