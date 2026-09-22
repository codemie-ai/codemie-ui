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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import storage from '@/utils/storage'

import { useChatConfiguration } from '../useChatConfiguration'

vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(() => []), getObject: vi.fn(() => ({})), remove: vi.fn() },
}))
vi.mock('@/store', () => ({ assistantsStore: { getAssistant: vi.fn() } }))
const mockChatsStore = vi.hoisted(() => ({ currentChat: { id: '', history: [] as unknown[] } }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

const storagePut = storage.put as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleSetSelectedSkills with currentChat.id === "" (not-yet-created chat)', () => {
  it("persists under chatSkillsKey('') instead of skipping the write", () => {
    const { result } = renderHook(() => useChatConfiguration())
    const skill = { value: 'skill-a', label: 'Skill A' }

    result.current.setSelectedSkills([skill])

    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-', [skill])
  })
})

describe('reload effect migrates the "" entry to the real chat id', () => {
  it("copies chatSkillsKey('') to the real id key and removes the '' entry", () => {
    const skill = { value: 'skill-a', label: 'Skill A' }
    const storageGet = storage.get as ReturnType<typeof vi.fn>
    const storageRemove = storage.remove as ReturnType<typeof vi.fn>
    storageGet.mockImplementation((_userId: string, key: string) =>
      key === 'chat-skills-' ? [skill] : []
    )
    mockChatsStore.currentChat = { id: '', history: [] }

    const { rerender } = renderHook(() => useChatConfiguration())

    mockChatsStore.currentChat = { id: 'real-id', history: [{ role: 'user' }] }
    rerender()

    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-real-id', [skill])
    expect(storageRemove).toHaveBeenCalledWith('user-1', 'chat-skills-')
  })

  it("is a no-op when nothing is stored under chatSkillsKey('')", () => {
    const storageGet = storage.get as ReturnType<typeof vi.fn>
    storageGet.mockReturnValue([])
    mockChatsStore.currentChat = { id: '', history: [] }

    const { rerender } = renderHook(() => useChatConfiguration())

    mockChatsStore.currentChat = { id: 'real-id', history: [{ role: 'user' }] }
    expect(() => rerender()).not.toThrow()
    expect(storagePut).not.toHaveBeenCalledWith('user-1', 'chat-skills-real-id', expect.anything())
  })
})
