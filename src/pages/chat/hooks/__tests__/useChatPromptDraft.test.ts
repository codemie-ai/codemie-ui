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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import storage from '@/utils/storage'

import { readPromptDraft, useChatPromptDraft } from '../useChatPromptDraft'

// @/utils/storage is globally mocked in setupTests.unit.ts as a default export:
// { getObject: vi.fn(), get: vi.fn(), put: vi.fn(), remove: vi.fn() }

describe('readPromptDraft', () => {
  beforeEach(() => {
    vi.mocked(storage.getObject).mockReturnValue(null)
  })

  it('returns null when no draft is stored', () => {
    expect(readPromptDraft('user-1', 'chat-1')).toBeNull()
  })

  it('calls storage.getObject with the correct namespaced key', () => {
    readPromptDraft('user-1', 'chat-1')

    expect(storage.getObject).toHaveBeenCalledWith('user-1', 'chat-prompt-draft-chat-1', null)
  })

  it('returns the stored draft when one exists', () => {
    const draft = { message: 'hello', messageRaw: '<p>hello</p>' }
    vi.mocked(storage.getObject).mockReturnValue(draft)

    expect(readPromptDraft('user-1', 'chat-1')).toEqual(draft)
  })

  it('returns null when storage.getObject throws (malformed JSON)', () => {
    vi.mocked(storage.getObject).mockImplementation(() => {
      throw new SyntaxError('Unexpected token')
    })

    expect(readPromptDraft('user-1', 'chat-1')).toBeNull()
  })
})

describe('useChatPromptDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(storage.getObject).mockReturnValue(null)
  })

  it('returns the empty-prompt default as initial when no draft is stored', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    expect(result.current.initial).toEqual({ message: '', messageRaw: '' })
  })

  it('returns the stored draft as initial when a draft exists', () => {
    const draft = { message: 'hello', messageRaw: '<p>hello</p>' }
    vi.mocked(storage.getObject).mockReturnValue(draft)

    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    expect(result.current.initial).toEqual(draft)
  })

  it('returns the empty-prompt default as initial when chatId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft(undefined, 'user-1'))

    expect(result.current.initial).toEqual({ message: '', messageRaw: '' })
    expect(storage.getObject).not.toHaveBeenCalled()
  })

  it('saveDraft calls storage.put with the correct key when messageRaw is non-empty', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(storage.put).toHaveBeenCalledWith('user-1', 'chat-prompt-draft-chat-1', {
      message: 'hello',
      messageRaw: '<p>hello</p>',
    })
    expect(storage.remove).not.toHaveBeenCalled()
  })

  it('saveDraft calls storage.remove when messageRaw is empty', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.saveDraft({ message: '', messageRaw: '' }))

    expect(storage.remove).toHaveBeenCalledWith('user-1', 'chat-prompt-draft-chat-1')
    expect(storage.put).not.toHaveBeenCalled()
  })

  it('clearDraft calls storage.remove with the correct key', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', 'user-1'))

    act(() => result.current.clearDraft())

    expect(storage.remove).toHaveBeenCalledWith('user-1', 'chat-prompt-draft-chat-1')
  })

  it('saveDraft is a no-op when chatId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft(undefined, 'user-1'))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(storage.put).not.toHaveBeenCalled()
    expect(storage.remove).not.toHaveBeenCalled()
  })

  it('saveDraft is a no-op when userId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', undefined))

    act(() => result.current.saveDraft({ message: 'hello', messageRaw: '<p>hello</p>' }))

    expect(storage.put).not.toHaveBeenCalled()
    expect(storage.remove).not.toHaveBeenCalled()
  })

  it('clearDraft is a no-op when chatId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft(undefined, 'user-1'))

    act(() => result.current.clearDraft())

    expect(storage.remove).not.toHaveBeenCalled()
  })

  it('clearDraft is a no-op when userId is undefined', () => {
    const { result } = renderHook(() => useChatPromptDraft('chat-1', undefined))

    act(() => result.current.clearDraft())

    expect(storage.remove).not.toHaveBeenCalled()
  })
})
