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
import { describe, it, expect, vi } from 'vitest'

import storage from '@/utils/storage'

import { useChatConfiguration } from '../useChatConfiguration'

vi.mock('@/utils/storage', () => ({
  default: {
    put: vi.fn(),
    get: vi.fn(() => ['skill-a', { value: 'skill-b', label: 'Skill B' }, { label: 'no value' }]),
    getObject: vi.fn(() => ({})),
    remove: vi.fn(),
  },
}))
vi.mock('@/store', () => ({ assistantsStore: { getAssistant: vi.fn() } }))
vi.mock('@/store/chats', () => ({
  chatsStore: { currentChat: { id: 'real-id', history: [{ role: 'user' }] } },
}))
vi.mock('@/store/user', () => ({ userStore: { user: { userId: 'user-1' } } }))

describe('loadChatSkills shape guard', () => {
  it('filters out a bare-string element and an object missing .value', () => {
    const { result } = renderHook(() => useChatConfiguration())

    expect(result.current.selectedSkills).toEqual([{ value: 'skill-b', label: 'Skill B' }])
    expect(storage.get).toHaveBeenCalled()
  })
})
