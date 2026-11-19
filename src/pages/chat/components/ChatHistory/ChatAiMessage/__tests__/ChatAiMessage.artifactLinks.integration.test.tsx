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

import { chatsStore } from '@/store/chats'
import type { ChatMessage } from '@/types/entity/conversation'

import ChatAiMessage from '../ChatAiMessage'

// Real Valtio, real Markdown and real ChatAiGeneratedFiles: an inline artifact link keeps its chip
// only when the conversation's file_names list it, and a write to the store re-renders the check.
vi.mock('@/store/chats', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return {
    chatsStore: proxy({
      currentChat: { id: 'chat-1', isWorkflow: false, history: [] as ChatMessage[][] },
      configs: [],
      openedChatsHistory: [],
    }),
  }
})
vi.mock('@/store/files', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return { filesStore: proxy({ downloadFile: vi.fn(), getFileURL: vi.fn((u: string) => u) }) }
})
vi.mock('@/store/appInfo', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')
  return { appInfoStore: proxy({ configs: [], getAllowedImageDomains: () => '' }) }
})
vi.mock('@/store/assistants', () => ({ assistantsStore: {} }))
vi.mock('@/store/user', () => ({ userStore: { user: null } }))
vi.mock('@/store/workflowExecutions', () => ({ workflowExecutionsStore: {} }))
vi.mock('@/utils/api', async () => {
  const actual = await vi.importActual<typeof import('@/utils/api')>('@/utils/api')
  return {
    ...actual,
    default: {
      BASE_URL: 'https://api.example.com',
      delete: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      stream: vi.fn(),
    },
  }
})
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))
vi.mock('@/hooks/useFeatureFlags', () => ({ useMermaidEnabled: () => [true, true] }))
vi.mock('@/hooks/useVueRouter', () => ({
  router: { push: vi.fn(), replace: vi.fn() },
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))
vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
    hideToolOutputs: false,
  })),
}))
vi.mock('@/components/Avatar/Avatar', () => ({ default: () => <div /> }))
vi.mock('../ChatAiMessageActions', () => ({ default: () => <div /> }))
vi.mock('../ThinkingLoader', () => ({ default: () => <div /> }))
vi.mock('../ChatA2uiBlock', () => ({ default: () => null }))
vi.mock('../../ChatUserMessage/EditMessageModal', () => ({ default: () => null }))

const store = chatsStore as unknown as {
  currentChat: { id: string; isWorkflow: boolean; history: ChatMessage[][] }
}

const part = (value: string) => `${value.length}~${value}`
const tokenFor = (name: string) => btoa(`${part('text/csv')}${part('workspace-w1')}${part(name)}`)
const art = tokenFor('artifacts/t1/report.csv')
const old = tokenFor('artifacts/t0/old.csv')
const linking = (token: string) => `See [the file](sandbox:/v1/files/${token}).`

const assistantMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    role: 'Assistant',
    response: linking(art),
    createdAt: '2026-01-01T00:00:00Z',
    assistant: { id: 'a1', name: 'A' },
    assistantId: 'a1',
    inProgress: false,
    stream: null,
    executionId: null,
    ...overrides,
  } as ChatMessage)

// Mirrors ChatHistory: the message comes off the chats snapshot and is the last history item.
const Harness: FC = () => {
  const snapshot = useSnapshot(chatsStore) as unknown as typeof store
  const historyIndex = snapshot.currentChat.history.length - 1
  const message = snapshot.currentChat.history[historyIndex][0]
  return (
    <ChatAiMessage
      indexes={{ historyIndex, messageIndex: 0 }}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={() => undefined}
    />
  )
}

const chips = () => screen.queryAllByLabelText('Download file')

describe('ChatAiMessage — inline artifact links against the listed files', () => {
  beforeEach(() => {
    store.currentChat.isWorkflow = false
  })

  it('keeps the chip for a file listed on this message', () => {
    store.currentChat.history = [[assistantMessage({ generatedFileNames: [art] })]]

    render(<Harness />)

    // Inline once; the generated-files row skips a file already linked inline
    expect(chips()).toHaveLength(1)
  })

  it('keeps the chip for a file listed on an earlier message', () => {
    store.currentChat.history = [
      [assistantMessage({ response: 'Here it is.', generatedFileNames: [old] })],
      [assistantMessage({ response: linking(old) })],
    ]

    render(<Harness />)

    expect(chips()).toHaveLength(1)
  })

  it('renders an unlisted artifact link as text', () => {
    store.currentChat.history = [[assistantMessage()]]

    const { container } = render(<Harness />)

    expect(chips()).toHaveLength(0)
    expect(screen.getByText('the file')).toBeInTheDocument()
    expect(container.querySelector('a[href*="/v1/files/"]')).toBeNull()
  })

  it('applies no list check in a workflow chat', () => {
    store.currentChat.isWorkflow = true
    store.currentChat.history = [[assistantMessage()]]

    render(<Harness />)

    expect(chips()).toHaveLength(1)
  })

  it("shows the chip once the turn's files are listed", async () => {
    store.currentChat.history = [[assistantMessage()]]
    render(<Harness />)
    expect(chips()).toHaveLength(0)

    // What refreshTurnFiles does after the stream ends
    store.currentChat.history[0][0].generatedFileNames = [art]

    expect(await screen.findByLabelText('Download file')).toBeInTheDocument()
    expect(chips()).toHaveLength(1)
  })

  it('skips a malformed listed token under the answer', () => {
    store.currentChat.history = [
      [assistantMessage({ response: 'Done.', generatedFileNames: [btoa('8~text/csv6~owner1')] })],
    ]

    render(<Harness />)

    expect(screen.queryByTestId('generated-files')).toBeNull()
  })
})
