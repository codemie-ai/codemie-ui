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

import { render, screen } from '@testing-library/react'
import { FC } from 'react'
import { useSnapshot } from 'valtio'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
import { chatsStore } from '@/store/chats'
import type { ChatMessage } from '@/types/entity/conversation'

import ChatA2uiBlock from '../ChatA2uiBlock'

// Real Valtio. The chat store is replaced by a bare `proxy()` so this file
// exercises the exact production data path: `useSnapshot` hands the component a
// proxy-compare tracking Proxy, and every envelope / data-model value read off
// it is a Proxy too — which `structuredClone` refuses to clone.
vi.mock('@/store/chats', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return {
    chatsStore: proxy({
      currentChat: { id: 'chat-1', isWorkflow: false, history: [] as ChatMessage[][] },
    }),
  }
})

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    submitA2uiAction: vi.fn(),
    editChatGeneration: vi.fn(),
  },
}))

const store = chatsStore as unknown as {
  currentChat: { id: string; isWorkflow: boolean; history: ChatMessage[][] }
}

const choiceSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['picker', 'approve'] },
        {
          id: 'picker',
          component: 'ChoicePicker',
          label: 'Color',
          variant: 'mutuallyExclusive',
          value: { path: '/color' },
          options: [
            { label: 'Red', value: 'red' },
            { label: 'Blue', value: 'blue' },
          ],
        },
        {
          id: 'approve',
          component: 'Button',
          child: 'approveLabel',
          action: { event: { name: 'approve' } },
        },
        { id: 'approveLabel', component: 'Text', text: 'Approve' },
      ],
    },
  },
]

const textSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['greeting'] },
        { id: 'greeting', component: 'Text', text: 'Hello from A2UI' },
      ],
    },
  },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path: '/', value: { name: 'Ada' } },
  },
]

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    role: 'Assistant',
    request: 'Hello',
    requestRaw: 'Hello',
    response: 'Fill the form',
    createdAt: '2026-04-30T10:00:00.000Z',
    assistantId: 'assistant-1',
    inProgress: false,
    executionId: null,
    ...overrides,
  } as ChatMessage)

/**
 * Mirrors the production render path: ChatHistory reads the history off a
 * Valtio snapshot and passes the snapshot message object down.
 */
const Harness: FC<{ historyIndex?: number }> = ({ historyIndex = 0 }) => {
  const snapshot = useSnapshot(chatsStore) as unknown as typeof store
  const message = snapshot.currentChat.history[historyIndex][0]
  return (
    <ChatA2uiBlock
      message={message}
      indexes={{ historyIndex, messageIndex: 0 }}
      isFormEditing={false}
      onSubmitted={() => undefined}
    />
  )
}

describe('ChatA2uiBlock against a real Valtio store', () => {
  beforeEach(() => {
    store.currentChat.history = []
  })

  it('renders the surface from snapshot envelopes (no DataCloneError fallback)', () => {
    store.currentChat.history = [[createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })]]

    render(<Harness />)

    expect(screen.queryByTestId('a2ui-fallback')).not.toBeInTheDocument()
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })

  it('prefills an answered surface whose saved value is an array (ChoicePicker)', () => {
    store.currentChat.history = [
      [createMessage({ a2uiEnvelopes: choiceSurfaceEnvelopes() })],
      [
        createMessage({
          role: 'User',
          a2uiAction: {
            version: A2UI_PROTOCOL_VERSION,
            action: { name: 'approve', surfaceId: 's1', sourceComponentId: 'approve' },
          },
          a2uiDataModel: { color: ['blue'] },
        }),
      ],
    ]

    render(<Harness />)

    expect(screen.queryByTestId('a2ui-fallback')).not.toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[0]).not.toBeChecked()
    expect(radios[1]).toBeChecked()
  })
})
