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

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { A2UI_PROTOCOL_VERSION, CATALOG_ID } from '@/a2ui/config'
import type { A2uiEnvelope } from '@/a2ui/types'
import type { ChatMessage } from '@/types/entity/conversation'
import toaster from '@/utils/toaster'

import ChatA2uiBlock from '../ChatA2uiBlock'
import ChatAiMessage from '../ChatAiMessage'

const { mockSubmitA2uiAction, mockChatsStore } = vi.hoisted(() => ({
  mockSubmitA2uiAction: vi.fn(),
  mockChatsStore: {
    currentChat: {
      id: 'chat-1',
      isWorkflow: false,
      history: [] as ChatMessage[][],
    },
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockChatsStore),
  subscribe: vi.fn(),
}))

vi.mock('@/store/chatGeneration', () => ({
  chatGenerationStore: {
    submitA2uiAction: (...args: unknown[]) => mockSubmitA2uiAction(...args),
    editChatGeneration: vi.fn(),
  },
}))

vi.mock('@/store/chats', () => ({
  chatsStore: mockChatsStore,
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

vi.mock('@/pages/chat/hooks/useChatContext', () => ({
  useChatContext: vi.fn(() => ({
    selectedAssistant: null,
    openConfigForm: vi.fn(),
    closeConfig: vi.fn(),
    isSharedPage: false,
  })),
}))

vi.mock('@/components/Avatar/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}))

vi.mock('@/components/markdown/Markdown', () => ({
  default: ({ content }: { content?: string }) => <div data-testid="markdown">{content}</div>,
}))

vi.mock('@/components/Thought/Thought', () => ({
  default: () => <div data-testid="thought" />,
}))

vi.mock('../ChatAiMessageActions', () => ({
  default: ({ onStartEditing }: { onStartEditing: () => void }) => (
    <button type="button" onClick={onStartEditing}>
      Edit message
    </button>
  ),
}))

vi.mock('../ThinkingLoader', () => ({
  default: () => <div data-testid="thinking-loader" />,
}))

vi.mock('../../ChatUserMessage/EditMessageModal', () => ({
  default: () => null,
}))

vi.mock('@/utils/helpers', () => ({
  formatDateTime: vi.fn(() => 'Apr 30'),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
  },
}))

const textSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['greeting', 'approve'] },
        { id: 'greeting', component: 'Text', text: 'Hello from A2UI' },
        { id: 'approve', component: 'Button', child: 'approveLabel', action: { event: { name: 'approve' } } },
        { id: 'approveLabel', component: 'Text', text: 'Approve' },
      ],
    },
  },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path: '/', value: { name: 'Ada' } },
  },
]

const modalSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        // The Modal renders its own trigger (as the reference renderer does), so the
        // layout holds the Modal, not the button. The catalog still forces that Button to
        // declare an action, which is what used to submit the surface on click.
        { id: 'root', component: 'Column', children: ['dialog'] },
        { id: 'openModal', component: 'Button', child: 'openLabel', action: { event: { name: 'openModal' } } },
        { id: 'openLabel', component: 'Text', text: 'Open dialog' },
        { id: 'dialog', component: 'Modal', trigger: 'openModal', content: 'dialogBody' },
        { id: 'dialogBody', component: 'Column', children: ['dialogText', 'confirm'] },
        { id: 'dialogText', component: 'Text', text: 'Inside the dialog' },
        { id: 'confirm', component: 'Button', child: 'confirmLabel', action: { event: { name: 'confirm' } } },
        { id: 'confirmLabel', component: 'Text', text: 'Confirm' },
      ],
    },
  },
]

const formSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['nameField', 'approve'] },
        { id: 'nameField', component: 'TextField', label: 'Name', value: { path: '/name' } },
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
  {
    version: A2UI_PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path: '/', value: { name: 'Ada' } },
  },
]

/** Two surfaces issued by ONE assistant message, each with its own button. */
const twoSurfaceEnvelopes = (): A2uiEnvelope[] => [
  ...['s1', 's2'].flatMap((surfaceId, index) => [
    { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
    {
      version: A2UI_PROTOCOL_VERSION,
      updateComponents: {
        surfaceId,
        components: [
          { id: 'root', component: 'Column', children: ['nameField', 'approve'] },
          { id: 'nameField', component: 'TextField', label: 'Name', value: { path: '/name' } },
          {
            id: 'approve',
            component: 'Button',
            child: 'approveLabel',
            action: { event: { name: 'approve' } },
          },
          {
            id: 'approveLabel',
            component: 'Text',
            text: index === 0 ? 'Approve A' : 'Approve B',
          },
        ],
      },
    },
    {
      version: A2UI_PROTOCOL_VERSION,
      updateDataModel: { surfaceId, path: '/', value: { name: index === 0 ? 'Ada' : 'Zed' } },
    },
  ]),
]

/** A surface whose TextField carries the `checks` (as the converter emits them). */
const validatedSurfaceEnvelopes = (surfaceId = 's1'): A2uiEnvelope[] => [
  { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId, catalogId: CATALOG_ID } },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId,
      components: [
        { id: 'root', component: 'Column', children: ['nameField', 'approve'] },
        {
          id: 'nameField',
          component: 'TextField',
          label: 'Name',
          value: { path: '/name' },
          checks: [
            {
              condition: {
                call: 'required',
                args: { value: { path: '/name' } },
                returnType: 'boolean',
              },
              message: 'Name is required',
            },
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
  {
    version: A2UI_PROTOCOL_VERSION,
    updateDataModel: { surfaceId, path: '/', value: { name: '' } },
  },
]

const createMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'Assistant',
  request: 'Hello',
  requestRaw: 'Hello',
  response: 'Fill the form',
  createdAt: '2026-04-30T10:00:00.000Z',
  assistantId: 'assistant-1',
  assistant: {
    id: 'assistant-1',
    name: 'Assistant',
  },
  inProgress: false,
  executionId: null,
  ...overrides,
})

const createAnswerTurn = (
  surfaceId = 's1',
  actionName = 'approve',
  dataModel: Record<string, unknown> = { name: 'Bob' }
): ChatMessage =>
  createMessage({
    role: 'User',
    request: 'name: Bob',
    requestRaw: 'name: Bob',
    a2uiAction: {
      version: A2UI_PROTOCOL_VERSION,
      action: { name: actionName, surfaceId, sourceComponentId: 'approve' },
    },
    a2uiDataModel: dataModel,
  })

const renderBlock = (
  message: ChatMessage,
  options: { historyIndex?: number; isFormEditing?: boolean; onSubmitted?: () => void } = {}
) =>
  render(
    <ChatA2uiBlock
      message={message}
      indexes={{ historyIndex: options.historyIndex ?? 0, messageIndex: 0 }}
      isFormEditing={options.isFormEditing ?? false}
      onSubmitted={options.onSubmitted ?? (() => undefined)}
    />
  )

describe('ChatA2uiBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitA2uiAction.mockReset()
    mockChatsStore.currentChat.history = []
  })

  it('renders the surface for a message with a2ui envelopes', () => {
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)
    expect(screen.getByTestId('a2ui-block')).toBeInTheDocument()
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })

  it('submits the action through the store with surface data model and display text', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1)
    expect(mockSubmitA2uiAction).toHaveBeenCalledWith(
      's1',
      'approve',
      'approve',
      { name: 'Ada' },
      'name: Ada',
      undefined
    )
  })

  it('does not submit while the chat is busy', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    const busy = createMessage({ role: 'Assistant', request: 'other', inProgress: true })
    mockChatsStore.currentChat.history = [[message, busy]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })

  it('does not submit a stale surface that is no longer at the live edge', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    const later = createMessage({ role: 'User', request: 'something else' })
    mockChatsStore.currentChat.history = [[message], [later]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })

  it('prefills the surface with the saved data model of the answered turn', () => {
    const message = createMessage({ a2uiEnvelopes: formSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn()]]
    renderBlock(message)

    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Ada')).not.toBeInTheDocument()
  })

  it('marks the button of the submitted action', () => {
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn()]]
    renderBlock(message)

    const answered = screen.getByTestId('a2ui-selected-approve')
    expect(answered).toBeInTheDocument()
    // Visible, not only addressable: the surface is read-only by then, so this button is
    // the only thing left saying which action was taken.
    expect(answered).toHaveClass('a2ui-answered')
    expect(answered).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps an answered surface read-only until it is unlocked', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn()]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })

  it('re-answers an unlocked surface by replacing the answered turn', async () => {
    const user = userEvent.setup()
    const onSubmitted = vi.fn()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn()]]
    renderBlock(message, { isFormEditing: true, onSubmitted })

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onSubmitted).toHaveBeenCalledTimes(1)
    expect(mockSubmitA2uiAction).toHaveBeenCalledWith(
      's1',
      'approve',
      'approve',
      { name: 'Bob' },
      'name: Bob',
      1
    )
  })

  it('falls back for envelopes carrying an unsupported component (no red SDK text)', () => {
    const message = createMessage({
      a2uiEnvelopes: [
        {
          version: A2UI_PROTOCOL_VERSION,
          createSurface: { surfaceId: 's1', catalogId: CATALOG_ID },
        },
        {
          version: A2UI_PROTOCOL_VERSION,
          updateComponents: {
            surfaceId: 's1',
            components: [{ id: 'root', component: 'FancyWidget' }],
          },
        },
      ],
    })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)
    expect(screen.getByTestId('a2ui-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('a2ui-fallback').textContent).toContain('FancyWidget')
  })

  it('falls back for envelopes the processor rejects', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const message = createMessage({
      a2uiEnvelopes: [
        {
          version: A2UI_PROTOCOL_VERSION,
          createSurface: { surfaceId: 's1', catalogId: 'https://bogus.example/catalog.json' },
        },
      ],
    })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)
    expect(screen.getByTestId('a2ui-fallback')).toBeInTheDocument()
  })

  // FIX-3: a created surface whose `root` never arrives (truncated stream) or
  // whose root component is named something else must degrade to the fallback,
  // never to the SDK's own gray "[Loading root...]" placeholder.
  it('falls back for a created surface whose components never arrived', () => {
    const message = createMessage({
      a2uiEnvelopes: [
        { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
      ],
    })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    expect(screen.getByTestId('a2ui-fallback')).toBeInTheDocument()
    expect(screen.queryByText(/Loading root/)).not.toBeInTheDocument()
  })

  it('falls back for a surface whose root component is not named "root"', () => {
    const message = createMessage({
      a2uiEnvelopes: [
        { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
        {
          version: A2UI_PROTOCOL_VERSION,
          updateComponents: {
            surfaceId: 's1',
            components: [{ id: 'form', component: 'Text', text: 'Hi' }],
          },
        },
      ],
    })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    expect(screen.getByTestId('a2ui-fallback')).toBeInTheDocument()
    expect(screen.queryByText(/Loading root/)).not.toBeInTheDocument()
  })

  it('renders nothing (no premature fallback) while the message is still streaming', () => {
    const message = createMessage({
      inProgress: true,
      a2uiEnvelopes: [
        { version: A2UI_PROTOCOL_VERSION, createSurface: { surfaceId: 's1', catalogId: CATALOG_ID } },
      ],
    })
    mockChatsStore.currentChat.history = [[message]]
    const { container } = renderBlock(message)

    expect(container.querySelector('[data-testid="a2ui-fallback"]')).toBeNull()
    expect(screen.queryByText(/Loading root/)).not.toBeInTheDocument()
  })

  // FIX-4: a message can carry more than one surface; state must be tracked per
  // surface, not only for the first `createSurface`.
  it('prefills only the answered surface of a multi-surface message', () => {
    const message = createMessage({ a2uiEnvelopes: twoSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn('s2')]]
    renderBlock(message)

    // s2 shows the submitted answer, s1 keeps its server-provided default.
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Ada')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Zed')).not.toBeInTheDocument()
  })

  it('replaces the answered turn when re-answering the second surface', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: twoSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn('s2')]]
    renderBlock(message, { isFormEditing: true })

    await user.click(screen.getByRole('button', { name: 'Approve B' }))

    expect(mockSubmitA2uiAction).toHaveBeenCalledWith(
      's2',
      'approve',
      'approve',
      { name: 'Bob' },
      'name: Bob',
      1
    )
  })

  it('keeps an answered surface read-only while a sibling surface stays answerable', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: twoSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn('s2')]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve B' }))
    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })

  // FIX-5: the guard flips only after an async hop, so a synchronous in-flight
  // latch is what actually prevents a second turn.
  it('submits once for a double click', async () => {
    const user = userEvent.setup()
    let release: () => void = () => undefined
    mockSubmitA2uiAction.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = () => resolve()
        })
    )
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    const button = screen.getByRole('button', { name: 'Approve' })
    await user.click(button)
    await user.click(button)

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1)

    // The latch releases once the submission settles.
    await act(async () => {
      release()
    })
    await user.click(button)
    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(2)
  })

  it('releases the surface after a rejected submission and reports it', async () => {
    const user = userEvent.setup()
    mockSubmitA2uiAction.mockRejectedValue(new Error('boom'))
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    const button = screen.getByRole('button', { name: 'Approve' })
    await user.click(button)
    await user.click(button)

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(2)
  })

  // FIX-6: agents attach `checks` to the INPUT, not to the button, so the
  // button's own `isValid` stays undefined — the block has to aggregate.
  it('does not submit while a surface check fails', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: validatedSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
    // No catalog component renders a failed check inline, so without this the
    // refusal is invisible and the button reads as broken.
    expect(vi.mocked(toaster.error)).toHaveBeenCalledWith(
      'Please complete the required fields before submitting'
    )

    await user.type(screen.getByRole('textbox'), 'Ada')
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1)
    expect(mockSubmitA2uiAction).toHaveBeenCalledWith(
      's1',
      'approve',
      'approve',
      { name: 'Ada' },
      'name: Ada',
      undefined
    )
  })

  it('opens the modal from its trigger instead of submitting the surface', async () => {
    // The trigger Button carries its own action (the schema requires one), so without
    // suppressing it a click both opened the dialog and submitted the answer — and the
    // submit ends the turn, so the dialog was never seen.
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: modalSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    expect(screen.queryByText('Inside the dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    // Asserted by what the user sees, not by role: the catalog's Modal renders a plain
    // overlay with no `role="dialog"`, so assistive technology is not told a dialog
    // opened. That is a gap in the catalog renderer, recorded here rather than papered
    // over — the behaviour under test is that the trigger opens instead of submitting.
    expect(screen.getByText('Inside the dialog')).toBeInTheDocument()
    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()
  })

  it('still submits from a button inside the modal content', async () => {
    // The trigger suppression must not leak into the dialog: a control the agent put
    // inside the modal is an ordinary action button.
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: modalSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    renderBlock(message)

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1)
    expect(mockSubmitA2uiAction).toHaveBeenCalledWith('s1', 'confirm', 'confirm', {}, 'confirm', undefined)
  })

  it('renders nothing without envelopes', () => {
    const message = createMessage()
    mockChatsStore.currentChat.history = [[message]]
    const { container } = renderBlock(message)
    expect(container.querySelector('[data-testid="a2ui-block"]')).toBeNull()
  })
})

describe('ChatAiMessage a2ui wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitA2uiAction.mockReset()
    mockChatsStore.currentChat.history = []
  })

  it('renders the assistant text and the form together, not one instead of the other', () => {
    // A surface does not silence the assistant: an agent that says "I need a few details"
    // and then shows the form must produce both, with the text above the surface.
    const message = createMessage({
      a2uiEnvelopes: textSurfaceEnvelopes(),
      response: 'I need a few details first:',
    })
    mockChatsStore.currentChat.history = [[message]]
    render(
      <ChatAiMessage
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )
    expect(screen.getByText('I need a few details first:')).toBeInTheDocument()
    expect(screen.getByTestId('a2ui-block')).toBeInTheDocument()
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })

  it('renders the a2ui block for a message carrying a2ui envelopes', () => {
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message]]
    render(
      <ChatAiMessage
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )
    expect(screen.getByTestId('a2ui-block')).toBeInTheDocument()
    expect(screen.getByText('Hello from A2UI')).toBeInTheDocument()
  })

  // A surface-only turn carries no assistant text; its metadata row must still
  // look like a regular response's.
  it('renders the processing duration for a surface-only response with no assistant text', () => {
    const message = createMessage({
      response: undefined,
      processingTime: 1.5,
      a2uiEnvelopes: textSurfaceEnvelopes(),
    })
    mockChatsStore.currentChat.history = [[message]]
    render(
      <ChatAiMessage
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )
    expect(screen.getByText(/Processed in: 1\.50s/)).toBeInTheDocument()
    expect(screen.getByTestId('a2ui-block')).toBeInTheDocument()
  })

  it('unlocks an answered a2ui form for re-answer through Edit', async () => {
    const user = userEvent.setup()
    const message = createMessage({ a2uiEnvelopes: textSurfaceEnvelopes() })
    mockChatsStore.currentChat.history = [[message], [createAnswerTurn()]]
    render(
      <ChatAiMessage
        indexes={{ historyIndex: 0, messageIndex: 0 }}
        message={message}
        totalMessages={1}
        onChangeMessageIndex={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    expect(mockSubmitA2uiAction).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Edit message' }))
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(mockSubmitA2uiAction).toHaveBeenCalledTimes(1)
    expect(mockSubmitA2uiAction).toHaveBeenCalledWith(
      's1',
      'approve',
      'approve',
      { name: 'Bob' },
      'name: Bob',
      1
    )
  })
})
