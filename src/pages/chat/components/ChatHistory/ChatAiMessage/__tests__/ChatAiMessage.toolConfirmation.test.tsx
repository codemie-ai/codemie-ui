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

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  s1Chunks,
  s1WaitingId,
  s5BatchPausedConversation,
  s5FirstPendingId,
  s5PausedConversation,
  s5SecondStepId,
  s6PausedConversation,
  TOOL_CALL_CANCELLED_MESSAGE,
  TOOL_CALL_UNAVAILABLE_MESSAGE,
  unavailableStep,
} from '@/store/__tests__/fixtures/toolCallResume.fixtures'
import { TOOL_CALL_DENIED_MESSAGE, ToolCallAction } from '@/types/chatGeneration'
import { ChatMessage, Thought } from '@/types/entity/conversation'

import ChatAiMessage from '../ChatAiMessage'

const { mockChatContext, mockChatsStore, mockChatGenerationStore } = vi.hoisted(() => ({
  mockChatContext: {
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
    hideToolOutputs: false,
  },
  mockChatsStore: {
    currentChat: { id: 'chat-1', isWorkflow: false, history: [[{}]] as any[][] },
    configs: [] as any[],
  },
  mockChatGenerationStore: {
    decideToolCall: vi.fn(async () => undefined),
    toolCallChoices: {} as Record<string, string>,
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store: any) => store),
  subscribe: vi.fn(),
}))
vi.mock('@/store/chatGeneration', () => ({ chatGenerationStore: mockChatGenerationStore }))
vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: vi.fn(() => ({ push: vi.fn() })) }))
vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => mockChatContext),
}))
vi.mock('@/components/Avatar/Avatar', () => ({ default: () => <div /> }))
vi.mock('@/components/markdown/Markdown', () => ({ default: () => <div /> }))
vi.mock('@/components/markdown/TextBlock', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))
vi.mock('../ChatAiMessageActions', () => ({ default: () => <div /> }))
vi.mock('../ThinkingLoader', () => ({ default: () => <div /> }))
vi.mock('../ChatA2uiBlock', () => ({ default: () => null }))
vi.mock('../../ChatUserMessage/EditMessageModal', () => ({ default: () => null }))
vi.mock('@/utils/helpers', () => ({ formatDateTime: vi.fn(() => 'Apr 30') }))
vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn(), info: vi.fn() } }))

// Deep clone so tests can edit fixtures without leaking into each other
const T = (v: any): Thought => structuredClone(v) as Thought

const makeMessage = (thoughts: Thought[], overrides: Partial<ChatMessage> = {}): ChatMessage =>
  ({
    role: 'Assistant',
    response: 'r',
    createdAt: '2026-01-01T00:00:00Z',
    assistant: { id: 'a1', name: 'A' },
    assistantId: 'a1',
    inProgress: false,
    stream: null,
    executionId: null,
    thoughts,
    ...overrides,
  } as ChatMessage)

const renderMessage = (message: ChatMessage) =>
  render(
    <ChatAiMessage
      indexes={{ historyIndex: 0, messageIndex: 0 }}
      message={message}
      totalMessages={1}
      onChangeMessageIndex={vi.fn()}
    />
  )

const batchMessage = (msg: Partial<ChatMessage> = {}) =>
  makeMessage(s5BatchPausedConversation.thoughts.map(T), msg)

// S1: delegation step with the waiting step nested at depth 1.
const s1Message = (overrides: Partial<Thought> = {}, msg: Partial<ChatMessage> = {}) => {
  const waiting = T({ ...s1Chunks[2].thought, ...overrides })
  const delegation = T({ ...s1Chunks[0].thought, in_progress: false, children: [waiting] })
  return makeMessage([delegation], msg)
}

const allowButtons = () => screen.queryAllByRole('button', { name: /allow/i })
const denyButtons = () => screen.queryAllByRole('button', { name: /deny/i })
const scrolledTo = (spy: ReturnType<typeof vi.fn>) =>
  spy.mock.contexts.map((el) => (el as Element).getAttribute('data-thought-id'))

describe('ChatAiMessage nested tool confirmation', () => {
  let scrollIntoView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockChatContext.isSharedPage = false
    mockChatContext.hideToolOutputs = false
    mockChatsStore.currentChat.isWorkflow = false
    mockChatsStore.currentChat.history = [[{}]]
    mockChatGenerationStore.toolCallChoices = {}
    scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView']
  })

  it('shows active Allow/Deny on every waiting step of a batch at once (AC1)', () => {
    renderMessage(batchMessage())
    expect(allowButtons()).toHaveLength(2)
    expect(denyButtons()).toHaveLength(2)
    allowButtons().forEach((button) => expect(button).toBeEnabled())
    denyButtons().forEach((button) => expect(button).toBeEnabled())
  })

  it('shows buttons on a depth-2 waiting step', () => {
    renderMessage(makeMessage(s6PausedConversation.thoughts.map(T)))
    expect(screen.getByRole('button', { name: /allow/i })).toBeEnabled()
  })

  it.each([
    ['stream set', { stream: { getStream: () => '' } as any }],
    ['inProgress', { inProgress: true }],
  ])('disables the buttons while this tab reads a live stream (%s) (AC12)', (_name, msg) => {
    renderMessage(batchMessage(msg))
    expect(allowButtons()).toHaveLength(2)
    allowButtons().forEach((button) => expect(button).toBeDisabled())
    denyButtons().forEach((button) => expect(button).toBeDisabled())
  })

  it('shows Allowed without buttons on a chosen step and keeps the buttons on the other (AC2)', () => {
    mockChatGenerationStore.toolCallChoices = { [s5FirstPendingId]: ToolCallAction.ALLOW }
    renderMessage(batchMessage())
    expect(screen.getByText('Allowed')).toBeInTheDocument()
    expect(screen.queryByText('Denied')).not.toBeInTheDocument()
    expect(allowButtons()).toHaveLength(1)
    const second = document.querySelector(`[data-thought-id="${s5SecondStepId}"]`)!
    expect(within(second as HTMLElement).getByRole('button', { name: /allow/i })).toBeEnabled()
  })

  it('shows Denied on a step chosen deny', () => {
    mockChatGenerationStore.toolCallChoices = { [s5SecondStepId]: ToolCallAction.DENY }
    renderMessage(batchMessage())
    expect(screen.getByText('Denied')).toBeInTheDocument()
    expect(allowButtons()).toHaveLength(1)
  })

  it('Deny records the choice and scrolls to the next undecided step', () => {
    renderMessage(batchMessage())
    const first = document.querySelector(`[data-thought-id="${s5FirstPendingId}"]`)!
    fireEvent.click(within(first as HTMLElement).getByRole('button', { name: /deny/i }))
    expect(mockChatGenerationStore.decideToolCall).toHaveBeenCalledWith(s5FirstPendingId, 'deny')
    expect(scrolledTo(scrollIntoView)).toEqual([s5SecondStepId])
  })

  it('Allow on the last step wraps the scroll to the first undecided step', () => {
    renderMessage(batchMessage())
    const second = document.querySelector(`[data-thought-id="${s5SecondStepId}"]`)!
    fireEvent.click(within(second as HTMLElement).getByRole('button', { name: /allow/i }))
    expect(mockChatGenerationStore.decideToolCall).toHaveBeenCalledWith(s5SecondStepId, 'allow')
    expect(scrolledTo(scrollIntoView)).toEqual([s5FirstPendingId])
  })

  it('scrolls to a next step whose id would break a CSS selector', () => {
    const quotedId = 'step"with]quote\\and\'apostrophe'
    const thoughts = s5BatchPausedConversation.thoughts.map(T)
    thoughts[2].children![0].id = quotedId
    renderMessage(makeMessage(thoughts))
    const first = document.querySelector(`[data-thought-id="${s5FirstPendingId}"]`)!
    fireEvent.click(within(first as HTMLElement).getByRole('button', { name: /deny/i }))
    expect(mockChatGenerationStore.decideToolCall).toHaveBeenCalledWith(s5FirstPendingId, 'deny')
    expect(scrolledTo(scrollIntoView)).toEqual([quotedId])
  })

  it('does not scroll when the click leaves no undecided step', () => {
    mockChatGenerationStore.toolCallChoices = { [s5FirstPendingId]: ToolCallAction.ALLOW }
    renderMessage(batchMessage())
    fireEvent.click(screen.getByRole('button', { name: /deny/i }))
    expect(mockChatGenerationStore.decideToolCall).toHaveBeenCalledWith(s5SecondStepId, 'deny')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('sends the waiting step id for a single S1 step (AC10)', () => {
    renderMessage(s1Message())
    fireEvent.click(screen.getByRole('button', { name: /allow/i }))
    expect(mockChatGenerationStore.decideToolCall).toHaveBeenCalledWith(s1WaitingId, 'allow')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it.each([
    ['denied', TOOL_CALL_DENIED_MESSAGE],
    ['cancelled', TOOL_CALL_CANCELLED_MESSAGE],
  ])('renders a %s step as Aborted with its message and no buttons (AC4, AC6)', (_n, message) => {
    const step = T({ ...unavailableStep, message })
    renderMessage(makeMessage([step], { inProgress: true }))
    expect(screen.getByText('Aborted')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Generic Jira Tool'))
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(allowButtons()).toHaveLength(0)
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument()
  })

  it('renders an Unavailable step as Aborted with its message and no buttons (AC9)', () => {
    renderMessage(makeMessage([T(unavailableStep)]))
    expect(screen.getByText('Aborted')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Generic Jira Tool'))
    expect(screen.getByText(TOOL_CALL_UNAVAILABLE_MESSAGE)).toBeInTheDocument()
    expect(allowButtons()).toHaveLength(0)
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument()
    expect(screen.queryByText('Not run')).not.toBeInTheDocument()
  })

  it('shows Waiting on the ancestors and on a message-less suspended sibling', () => {
    renderMessage(makeMessage(s5PausedConversation.thoughts.map(T)))
    expect(allowButtons()).toHaveLength(1)
    // S1 container (ancestor), S2 container and its queued step (empty, undecided)
    expect(screen.getAllByText('Waiting')).toHaveLength(3)
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('keeps Waiting on the ancestors of a chosen step before the send', () => {
    mockChatGenerationStore.toolCallChoices = { [s5FirstPendingId]: ToolCallAction.ALLOW }
    renderMessage(makeMessage(s5PausedConversation.thoughts.map(T)))
    expect(screen.getByText('Allowed')).toBeInTheDocument()
    expect(screen.getAllByText('Waiting')).toHaveLength(3)
    expect(screen.queryByText('Not run')).not.toBeInTheDocument()
  })

  it('keeps only the ancestor chain visible with hidden outputs', () => {
    mockChatContext.hideToolOutputs = true
    renderMessage(makeMessage(s5PausedConversation.thoughts.map(T)))
    expect(screen.queryByText('Codemie Thoughts')).not.toBeInTheDocument()
    expect(screen.queryByText('S2-Ask-B317C7')).not.toBeInTheDocument()
    expect(screen.getByText('S1-Ask-B317C7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /allow/i })).toBeInTheDocument()
    expect(within(document.body).getAllByText('Generic Jira Tool')).toHaveLength(1)
  })

  it('has no buttons on shared pages', () => {
    mockChatContext.isSharedPage = true
    renderMessage(batchMessage())
    expect(allowButtons()).toHaveLength(0)
  })

  it('has no buttons in workflow chats', () => {
    mockChatsStore.currentChat.isWorkflow = true
    renderMessage(batchMessage())
    expect(allowButtons()).toHaveLength(0)
  })

  it('shows Waiting on an ancestor that streamed text while its child is waiting', () => {
    const waiting = T(s1Chunks[2].thought)
    const delegation = T({
      ...s1Chunks[0].thought,
      in_progress: false,
      message: 'Delegating to S',
      children: [waiting],
    })
    renderMessage(makeMessage([delegation]))
    expect(screen.getAllByText('Waiting')).toHaveLength(1)
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('has no buttons on a message that is not the last history item', () => {
    mockChatsStore.currentChat.history = [[{}], [{}]]
    renderMessage(batchMessage())
    expect(allowButtons()).toHaveLength(0)
  })

  it('has no buttons on a message variant that is not the last one', () => {
    mockChatsStore.currentChat.history = [[{}, {}]]
    renderMessage(batchMessage())
    expect(allowButtons()).toHaveLength(0)
  })

  it('keeps the ancestors of a sent allowed step open and not Success while it runs (AC4)', () => {
    renderMessage(
      s1Message({ interrupted: false, in_progress: true, message: '' }, { inProgress: true })
    )
    // The delegation step and the allowed step it holds both read In Progress
    expect(screen.getAllByText('In Progress')).toHaveLength(2)
    expect(screen.getByText('Generic Jira Tool')).toBeInTheDocument()
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('keeps a depth-2 ancestor chain of a sent allowed step open while it runs (AC4)', () => {
    const thoughts = s6PausedConversation.thoughts.map(T)
    Object.assign(thoughts[0].children![0].children![0], {
      interrupted: false,
      in_progress: true,
      message: '',
    })
    renderMessage(makeMessage(thoughts, { inProgress: true }))
    expect(screen.getAllByText('In Progress')).toHaveLength(3)
    expect(screen.getByText('Generic Jira Tool')).toBeInTheDocument()
    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('applies the normal statuses once the sent step has finished', () => {
    renderMessage(s1Message({ interrupted: false, in_progress: false }, { inProgress: true }))
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.queryByText('In Progress')).not.toBeInTheDocument()
  })

  it('does not replace Failed, Aborted or In Progress with Waiting during a pause', () => {
    const thoughts = [
      T({ ...s1Chunks[2].thought, parent_id: null }),
      T({ id: 'failed', author_name: 'Failed Tool', message: '', error: true, children: [] }),
      T({ id: 'aborted', author_name: 'Aborted Tool', message: '', aborted: true, children: [] }),
      T({
        id: 'running',
        author_name: 'Running Tool',
        message: '',
        in_progress: true,
        children: [],
      }),
    ]
    renderMessage(makeMessage(thoughts))
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Aborted')).toBeInTheDocument()
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument()
  })
})
