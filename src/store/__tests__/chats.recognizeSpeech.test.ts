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

import { describe, expect, it, vi } from 'vitest'

const mockPostMultipart = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postMultipart: (...args: unknown[]) => mockPostMultipart(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

describe('chatsStore.recognizeSpeech', () => {
  it('posts the audio file without a model field when none is given', async () => {
    mockPostMultipart.mockResolvedValueOnce({ json: () => Promise.resolve({ message: 'hi' }) })
    const { chatsStore } = await import('@/store/chats')

    await chatsStore.recognizeSpeech(new Blob())

    const [url, body] = mockPostMultipart.mock.calls[0]
    expect(url).toBe('v1/speech-recognition')
    expect((body as FormData).has('model')).toBe(false)
    expect((body as FormData).has('conversation_id')).toBe(false)
  })

  it('includes the selected model as a form field when one is given', async () => {
    mockPostMultipart.mockResolvedValueOnce({ json: () => Promise.resolve({ message: 'hi' }) })
    const { chatsStore } = await import('@/store/chats')

    await chatsStore.recognizeSpeech(new Blob(), 'whisper-azure')

    const [, body] = mockPostMultipart.mock.calls[0]
    expect((body as FormData).get('model')).toBe('whisper-azure')
  })

  it('includes conversation_id as a form field when a conversation id is given', async () => {
    mockPostMultipart.mockResolvedValueOnce({ json: () => Promise.resolve({ message: 'hi' }) })
    const { chatsStore } = await import('@/store/chats')

    await chatsStore.recognizeSpeech(new Blob(), 'whisper-azure', 'chat-1')

    const [, body] = mockPostMultipart.mock.calls.at(-1)!
    expect((body as FormData).get('conversation_id')).toBe('chat-1')
  })

  it('omits conversation_id for a chat that is not created yet (empty id)', async () => {
    mockPostMultipart.mockResolvedValueOnce({ json: () => Promise.resolve({ message: 'hi' }) })
    const { chatsStore } = await import('@/store/chats')

    await chatsStore.recognizeSpeech(new Blob(), undefined, '')

    const [, body] = mockPostMultipart.mock.calls.at(-1)!
    expect((body as FormData).has('conversation_id')).toBe(false)
  })
})
