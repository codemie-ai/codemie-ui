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

import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
import type { ChatMessage } from '@/types/entity/conversation'

import ChatA2uiBlock from '../ChatA2uiBlock'

/**
 * The DOM guard (a disabled fieldset) and the JS guard (`isSurfaceActive` inside
 * `handleAction`) both stop a submit from a shared conversation, so a test driven by a
 * click cannot tell which one fired — jsdom swallows the click on a disabled fieldset
 * either way. The SDK dispatches through the action handler, not through the DOM button,
 * so this suite captures that handler and calls it directly, leaving only the JS guard.
 */

const { mockSubmitA2uiAction, mockChatsStore, mockChatContext, capturedHandler } = vi.hoisted(
  () => ({
    mockSubmitA2uiAction: vi.fn(),
    mockChatsStore: {
      currentChat: { id: 'chat-1', isWorkflow: false, history: [] as ChatMessage[][] },
    },
    mockChatContext: { isSharedPage: false },
    capturedHandler: { current: null as ((event: unknown) => void) | null },
  })
)

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    submitA2uiAction: (...args: unknown[]) => mockSubmitA2uiAction(...args),
    editChatGeneration: vi.fn(),
  },
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))

vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))

// Capture the action handler the block registers, and render no actual surface.
vi.mock('@/a2ui/useA2uiSurface', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/a2ui/useA2uiSurface')>()
  return {
    ...actual,
    // The stub surface carries no components, so the real validity check would refuse the
    // submit before the guard under test is even reached.
    isSurfaceValid: () => true,
    useA2uiSurface: (
      _envelopes: unknown,
      onAction?: (event: unknown) => void
    ) => {
      capturedHandler.current = onAction ?? null
      return {
        surfaces: [{ id: 's1', components: new Map() }],
        unsupportedComponent: null,
        error: false,
        missingRoot: false,
      }
    },
  }
})

vi.mock('@/a2ui/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/a2ui/config')>()
  return { ...actual, A2uiSurface: () => <div data-testid="surface" /> }
})

const envelopes: A2uiEnvelope[] = [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
]

const message = {
  id: 'm1',
  role: 'Assistant',
  response: '',
  inProgress: false,
  a2uiEnvelopes: envelopes,
} as unknown as ChatMessage

const renderBlock = () =>
  render(
    <ChatA2uiBlock
      message={message}
      indexes={{ historyIndex: 0, messageIndex: 0 }}
      isFormEditing={false}
      onSubmitted={() => undefined}
    />
  )

const dispatchAction = () =>
  capturedHandler.current?.({
    name: 'approve',
    surfaceId: 's1',
    sourceComponentId: 'approve',
    dataModel: { name: 'Ada' },
  })

describe('ChatA2uiBlock action guard, bypassing the DOM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitA2uiAction.mockReset()
    capturedHandler.current = null
    mockChatsStore.currentChat.history = [[message]]
    mockChatContext.isSharedPage = false
  })

  it('submits an action dispatched by the SDK in a normal chat', async () => {
    renderBlock()

    dispatchAction()

    // The handler returns void and submits on a later tick, so the assertion waits for it
    // rather than awaiting the dispatch itself.
    await waitFor(() => expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1))
  })

  it('refuses an action dispatched by the SDK in the shared view', async () => {
    mockChatContext.isSharedPage = true
    renderBlock()

    dispatchAction()
    // Nothing to wait for when the guard holds, so the queue is flushed and then asserted —
    // otherwise the assertion would pass simply by running before the submit could happen.
    await act(async () => {})

    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })
})
