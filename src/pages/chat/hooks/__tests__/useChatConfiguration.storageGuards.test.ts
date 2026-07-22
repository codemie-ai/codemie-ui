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

import storage from '@/utils/storage'

import { saveChatSkills, saveChatTools } from '../useChatConfiguration'

vi.mock('@/utils/storage', () => ({
  default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/store', () => ({ assistantsStore: {} }))
vi.mock('@/store/chats', () => ({ chatsStore: {} }))
vi.mock('@/store/user', () => ({ userStore: {} }))

const storagePut = storage.put as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveChatSkills', () => {
  it('does not write when skills array is empty', () => {
    saveChatSkills('user-1', 'chat-1', [])
    expect(storagePut).not.toHaveBeenCalled()
  })

  it('writes when skills array is non-empty', () => {
    const skill = { value: 'skill-a', label: 'Skill A' }
    saveChatSkills('user-1', 'chat-1', [skill])
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-skills-chat-1', [skill])
  })

  it('silently swallows QuotaExceededError', () => {
    storagePut.mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => saveChatSkills('user-1', 'chat-1', [{ value: 'a', label: 'A' }])).not.toThrow()
  })
})

describe('saveChatTools', () => {
  it('does not write when both properties are null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: null, enableCodeInterpreter: null })
    expect(storagePut).not.toHaveBeenCalled()
  })

  it('writes when enableWebSearch is non-null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: true, enableCodeInterpreter: null })
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1', {
      enableWebSearch: true,
      enableCodeInterpreter: null,
    })
  })

  it('writes when enableCodeInterpreter is non-null', () => {
    saveChatTools('user-1', 'chat-1', { enableWebSearch: null, enableCodeInterpreter: true })
    expect(storagePut).toHaveBeenCalledWith('user-1', 'chat-tools-config-chat-1', {
      enableWebSearch: null,
      enableCodeInterpreter: true,
    })
  })

  it('silently swallows QuotaExceededError', () => {
    storagePut.mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() =>
      saveChatTools('user-1', 'chat-1', { enableWebSearch: true, enableCodeInterpreter: null })
    ).not.toThrow()
  })
})
