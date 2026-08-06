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

import { proxy, ref } from 'valtio'

import { ROLE_USER } from '@/constants'
import { GENERATION_CANCELLED_MESSAGE } from '@/constants/chats'
import { WORKFLOW_STATE_EVENT_INTERRUPTED, WORKFLOW_STATUSES } from '@/constants/workflows'
import { ChatRequest, HistoryMessage, ChatGenerationOptions } from '@/types/chatGeneration'
import { Assistant } from '@/types/entity/assistant'
import { Conversation, ChatMessage, ChatListItem, Thought } from '@/types/entity/conversation'
import type { InteractiveResponse } from '@/types/entity/interactive'
import {
  MCPAuthGateServer,
  MCPAuthInitiateResponse,
  MCPAuthRecoverableStatus,
} from '@/types/entity/mcpAuth'
import api, { ABORT_ERROR, DEFAULT_ERROR_MESSAGE } from '@/utils/api'
import { transformChatHistoryFEtoBE } from '@/utils/chatHelpers'
import { DEFAULT_TOOLS_CONFIG, saveChatSkills, saveChatTools } from '@/utils/chatStorageUtils'
import { isChatContextualNamingEnabled } from '@/utils/featureFlags'
import { fileToBase64 } from '@/utils/helpers'
import { parseMCPAuthRequiredErrorPayload } from '@/utils/mcpAuth'
import {
  getPendingInitiate,
  getRecoverableAuthStatus,
  MISSING_REDIRECT_HOSTNAME_MESSAGE,
  POPUP_BLOCKED_AUTH_MESSAGE,
} from '@/utils/mcpAuthInitiate'
import Stream, { streamChunkToObject } from '@/utils/stream'
import toaster from '@/utils/toaster'

import { assistantsStore } from './assistants'
import { chatsStore } from './chats'
import { userStore } from './user'
import { workflowExecutionsStore } from './workflowExecutions'
import { workflowsStore } from './workflows'

const STREAMING_NOTIFICATION = 'Still waiting for response, agent is thinking'
const STREAMING_NOTIFICATION_INTERVAL = 5_000 // 5 seconds
const ASSISTANT_NOT_FOUND =
  'Assistant you are trying to reach is not found. Please mention another one using @mention.'
const WORKFLOW_DELETED = 'This workflow was deleted and can no longer be used.'
const EMPTY_MESSAGE = '/Empty message/'

const MAX_RENAME_POLL_ATTEMPTS = 8
const RENAME_POLL_BASE_DELAY_MS = 500
const RENAME_POLL_MAX_DELAY_MS = 4_000

// Backend renames the chat asynchronously (BackgroundTasks, after the stream
// closes) — tracked here so a chat switch/delete can cancel a pending retry
// instead of it firing against a chat the user has navigated away from.
const renameChatPollTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

interface StreamDrainState {
  cachedValue: string
  response: any
  receivedFinalChunk: boolean
  notificationTimeoutId: NodeJS.Timeout | null
}

interface ChatGenerationStoreType {
  chatAbortControllers: Record<string, AbortController>

  createChatGeneration: (options: ChatGenerationOptions) => Promise<void>

  updateCurrentChatAssistants: (chat: Conversation, assistant: Assistant) => void

  editChatGeneration: (
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    message: string
  ) => Promise<void>
  deleteChatMessage: (chatId: string, historyIndex: number) => Promise<void>

  stopChatGeneration: (chatId: string) => void
  submitInteractiveResponse: (
    response: InteractiveResponse,
    displayText: string,
    replaceHistoryIndex?: number
  ) => Promise<void>
  resumeWorkflowExecution: (userInput?: string, fileNames?: string[]) => Promise<void>
  abortWorkflowChat: (chatId: string) => Promise<void>
  updateWorkflowChatOutput: (chatId: string, output: string) => Promise<{ message: string } | void>
  getAuthenticatingPromptIds: (chatId: string) => string[]
  initiatePromptAuth: (
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    mcpConfigId: string
  ) => Promise<void>
  continuePromptAuth: (
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    mcpConfigId: string
  ) => Promise<void>
  cancelPromptAuth: (
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    mcpConfigId: string
  ) => void
  markPromptAuthSuccess: (chatId: string, authConfigId: string) => void
  rollbackPromptAuthRow: (chatId: string, authConfigId: string, errorContext: string | null) => void

  // Private methods
  _getAssistant: (assistantId: string | undefined) => Promise<Assistant>
  _getWorkflowAsAssistant: (
    workflowId: string | undefined,
    chat: Conversation
  ) => Promise<Assistant>
  _createHistoryItem: (
    message: string,
    messageRaw: string,
    assistantId: string,
    fileNames: string[] | null,
    assistant: Assistant
  ) => ChatMessage
  _addMessageToHistory: (
    chat: Conversation,
    historyItem: ChatMessage,
    historyIndex: number | null,
    messageIndex: number | null
  ) => { historyIndex: number; messageIndex: number }
  _updateChatMetadata: (
    chat: Conversation,
    assistant: Assistant
  ) => Partial<ChatListItem> & { id: string }
  _updateChatNameIfNeeded: (
    chat: Conversation,
    message: string,
    historyIndex: number,
    messageIndex: number
  ) => void
  _clearPendingRenameForFirstMessage: (
    chat: Conversation,
    historyIndex: number,
    messageIndex: number
  ) => void
  _pollForRenamedChat: (chatId: string, optimisticName: string, attempt?: number) => void
  _checkRenamedChat: (chatId: string, optimisticName: string, attempt: number) => Promise<void>
  _sendRequest: (
    chat: Conversation,
    historyIndex: number,
    messageIndex: number,
    data: ChatRequest
  ) => Promise<void>
  _handleGenerationStream: (
    historyItem: ChatMessage,
    reader: ReadableStreamDefaultReader
  ) => Promise<any>
  _processStreamChunk: (
    historyItem: ChatMessage,
    value: string,
    state: StreamDrainState
  ) => Promise<void>
  _handleChunk: (
    historyItem: ChatMessage,
    value: string
  ) => Promise<{ finalChunk: any; incompleteChunk: string | null }>
  _handleThought: (historyItem: ChatMessage, thought: Partial<Thought>) => void
  _findThought: (thoughts: Thought[], targetId: string) => Thought | null
  _handleGenerationStreamError: (errorObj: any) => string
  _finishThoughts: (historyItem: ChatMessage) => void
  _handleGenerationAbort: (historyItem: ChatMessage, reader: ReadableStreamDefaultReader) => any
  _scheduleWaitingNotification: (historyItem: ChatMessage) => NodeJS.Timeout
  _clearWaitingNotification: (historyItem: ChatMessage, timeoutId?: NodeJS.Timeout) => void
  _prepareRequestData: (
    chat: Conversation,
    entityId: string,
    data: ChatRequest
  ) => { endpoint: string; requestData?: any; method?: string }
  _handleRequestError: (historyItem: ChatMessage, error: any, startTime: Date) => void
  _removeOptimisticTurn: (historyItem: ChatMessage) => void
  _handleNonStreamResponse: (
    reader: Response,
    historyItem: ChatMessage,
    chat: Conversation,
    startTime: Date
  ) => Promise<void>
  _handleStreamResponse: (
    reader: ReadableStreamDefaultReader,
    historyItem: ChatMessage,
    chat: Conversation,
    startTime: Date
  ) => Promise<void>
}

const getCurrentChatById = (chatId: string): Conversation | null => {
  const { currentChat } = chatsStore

  if (!currentChat || currentChat.id !== chatId) return null

  return currentChat
}

const getPromptRecoverableStatus = (row: MCPAuthGateServer): MCPAuthRecoverableStatus =>
  getRecoverableAuthStatus(row)

const getPromptMessage = (
  chat: Conversation,
  historyIndex: number,
  messageIndex: number
): ChatMessage | null => chat.history[historyIndex]?.[messageIndex] ?? null

const getPromptRows = (message: ChatMessage | null): MCPAuthGateServer[] =>
  message?.mcpAuthPromptRows ?? []

const markThoughtDone = (thought: Thought): void => {
  thought.in_progress = false
  thought.children?.forEach(markThoughtDone)
}

const finishThoughts = (historyItem: ChatMessage): void => {
  if (!historyItem.thoughts) return

  historyItem.thoughts.forEach((thought, index) => {
    markThoughtDone(thought)
    historyItem.thoughts![index] = thought
  })
}

const finalizeFailedRequest = (historyItem: ChatMessage, startTime: Date): void => {
  historyItem.inProgress = false
  historyItem.stream = null
  finishThoughts(historyItem)

  const endTime = new Date()
  historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
}

const applyPromptRows = (
  historyItem: ChatMessage,
  promptRows: MCPAuthGateServer[],
  startTime: Date
): void => {
  historyItem.response = undefined
  historyItem.mcpAuthPromptRows = promptRows
  finalizeFailedRequest(historyItem, startTime)
}

const updatePromptRowsAtIndexes = (
  chat: Conversation,
  historyIndex: number,
  messageIndex: number,
  updater: (rows: MCPAuthGateServer[]) => MCPAuthGateServer[] | null
): boolean => {
  const message = getPromptMessage(chat, historyIndex, messageIndex)
  const rows = getPromptRows(message)

  if (!message || !rows.length) return false

  const nextRows = updater(rows)
  if (!nextRows?.length) return false

  message.mcpAuthPromptRows = nextRows
  return true
}

const updateAuthenticatingPromptRow = (
  chat: Conversation,
  authConfigId: string,
  updater: (row: MCPAuthGateServer) => MCPAuthGateServer
): boolean => {
  if (!authConfigId) return false

  for (let historyIndex = chat.history.length - 1; historyIndex >= 0; historyIndex -= 1) {
    const group = chat.history[historyIndex]

    for (let messageIndex = group.length - 1; messageIndex >= 0; messageIndex -= 1) {
      const message = group[messageIndex]
      const rows = getPromptRows(message)
      const targetIndex = rows.findIndex(
        (row) => row.auth_config_id === authConfigId && row.status === 'authenticating'
      )

      if (targetIndex === -1) continue

      message.mcpAuthPromptRows = rows.map((row, index) =>
        index === targetIndex ? updater(row) : row
      )

      return true
    }
  }

  return false
}

const getAuthenticatingPromptIdsFromChat = (chat: Conversation): string[] => {
  const authConfigIds = new Set<string>()

  chat.history.forEach((group) => {
    group.forEach((message) => {
      getPromptRows(message).forEach((row) => {
        if (row.status === 'authenticating' && row.auth_config_id) {
          authConfigIds.add(row.auth_config_id)
        }
      })
    })
  })

  return [...authConfigIds]
}

export const chatGenerationStore = proxy<ChatGenerationStoreType>({
  chatAbortControllers: {},

  async createChatGeneration(options: ChatGenerationOptions): Promise<void> {
    const {
      message,
      messageRaw = message,
      assistantId,
      files = [],
      skillIds,
      dynamicToolsConfig,
      interactiveResponse,
    } = options
    const fileNames = files?.length ? files : null
    let { historyIndex = null, messageIndex = null } = options

    const chat = chatsStore.currentChat
    if (!chat) {
      toaster.error('No chat available')
      throw new Error('No current chat')
    }

    if (chatsStore.isNewChat) {
      const pendingLlmModel = chat.llmModel
      await chatsStore.createChat()
      const newId = chatsStore.currentChat!.id
      const userId = userStore.user?.userId
      if (userId) {
        saveChatTools(userId, newId, dynamicToolsConfig ?? DEFAULT_TOOLS_CONFIG)
        saveChatSkills(userId, newId, skillIds ?? [])
      }
      if (pendingLlmModel) await chatsStore.updateChat(newId, { llmModel: pendingLlmModel })
      await chatGenerationStore.createChatGeneration(options)
      return
    }

    // Validate workflow availability before creating a history item; assistant data comes from chat.
    const assistant = chat.isWorkflow
      ? await chatGenerationStore._getWorkflowAsAssistant(assistantId, chat)
      : await chatGenerationStore._getAssistant(assistantId)

    const history = transformChatHistoryFEtoBE(chat, historyIndex)
    const nextHistoryIndex = history.length ? history.length / 2 : 0

    const data: ChatRequest = {
      conversationId: chat.id,
      text: message,
      contentRaw: messageRaw,
      file_names: fileNames ?? [],
      llmModel: chat.llmModel ?? null,
      history: history as HistoryMessage[],
      historyIndex: Number.isInteger(historyIndex) ? historyIndex : nextHistoryIndex,
      mcpServerSingleUsage: false,
      workflowExecutionId: null,
      stream: true,
      topK: 10,
      systemPrompt: '',
      backgroundTask: false,
      metadata: null,
      toolsConfig: [],
      outputSchema: null,
      skill_ids: skillIds?.length ? skillIds : undefined,
      enable_web_search: dynamicToolsConfig?.enableWebSearch ?? undefined,
      enable_code_interpreter: dynamicToolsConfig?.enableCodeInterpreter ?? undefined,
      ...(interactiveResponse ? { interactiveResponse } : {}),
    }

    const historyItem = chatGenerationStore._createHistoryItem(
      message,
      messageRaw,
      assistantId!,
      fileNames,
      assistant
    )
    if (interactiveResponse) historyItem.interactiveResponse = interactiveResponse

    const indexes = chatGenerationStore._addMessageToHistory(
      chat,
      historyItem,
      historyIndex,
      messageIndex
    )
    historyIndex = indexes.historyIndex
    messageIndex = indexes.messageIndex

    const chatListItemUpdate = chatGenerationStore._updateChatMetadata(chat, assistant)
    chatGenerationStore._updateChatNameIfNeeded(chat, message, historyIndex, messageIndex)

    await chatGenerationStore._sendRequest(chat, historyIndex, messageIndex, data)

    // Apply avatar/group update only after a real response is received.
    // Skipped for MCP auth gates (mcpAuthPromptRows set) and failed non-stream requests
    // (response stays undefined) so that a failed exchange doesn't leave stale avatars.
    if (historyItem.response !== undefined && !historyItem.mcpAuthPromptRows?.length) {
      chatsStore.updateChatListItem({
        ...chatListItemUpdate,
        updateDate: new Date().toISOString(),
      })
    }
  },

  async _getAssistant(assistantId: string | undefined): Promise<Assistant> {
    if (!assistantId) {
      toaster.error(ASSISTANT_NOT_FOUND)
      return Promise.reject(new Error('No assistant ID provided'))
    }

    try {
      return await assistantsStore.getAssistant(assistantId, true)
    } catch (e) {
      toaster.error(ASSISTANT_NOT_FOUND)
      return Promise.reject(e)
    }
  },

  async _getWorkflowAsAssistant(
    workflowId: string | undefined,
    chat: Conversation
  ): Promise<Assistant> {
    if (!workflowId) {
      toaster.error(WORKFLOW_DELETED)
      return Promise.reject(new Error('No workflow ID provided'))
    }

    try {
      await workflowsStore.getWorkflow(workflowId, true)
    } catch (error) {
      toaster.error(WORKFLOW_DELETED)
      throw error instanceof Error ? error : new Error(String(error))
    }

    // Use existing assistant data from chat (populated by backend)
    const assistantData = chat.assistantData?.[0]
    if (assistantData) {
      return {
        id: assistantData.id,
        name: assistantData.name,
        icon_url: assistantData.iconUrl,
        context: assistantData.context?.map((name) => ({ name })) ?? [],
        tools: assistantData.tools?.map((name) => ({ name })) ?? [],
      } as Assistant
    }

    // Fallback: create minimal assistant object
    return {
      id: workflowId,
      name: 'Workflow',
      icon_url: '',
      context: [],
      tools: [],
    } as unknown as Assistant
  },

  _createHistoryItem(
    message: string,
    messageRaw: string,
    assistantId: string,
    fileNames: string[] | null,
    assistant: Assistant
  ): ChatMessage {
    return {
      role: ROLE_USER,
      request: message,
      requestRaw: messageRaw,
      createdAt: new Date().toISOString(),
      inProgress: true,
      assistantId,
      executionId: null,
      ...(fileNames ? { fileNames } : {}),
      assistant: {
        id: assistant.id,
        name: assistant.name,
        iconUrl: assistant.icon_url,
        context: (assistant.context ?? []).map((context) => context.name),
        tools: (assistant.tools ?? []).map((tool) => tool.name),
      },
    }
  },

  _addMessageToHistory(
    chat: Conversation,
    historyItem: ChatMessage,
    historyIndex: number | null,
    messageIndex: number | null
  ): { historyIndex: number; messageIndex: number } {
    const isNewMessage = historyIndex === null && messageIndex === null
    const isEditingMessage = messageIndex === null && historyIndex !== null

    if (isNewMessage) {
      chat.history.push([historyItem])
      return {
        historyIndex: chat.history.length - 1,
        messageIndex: 0,
      }
    }

    if (isEditingMessage) {
      chat.history[historyIndex!].push(historyItem)
      return {
        historyIndex: historyIndex!,
        messageIndex: chat.history[historyIndex!].length - 1,
      }
    }

    return { historyIndex: historyIndex!, messageIndex: messageIndex! }
  },

  _updateChatMetadata(
    chat: Conversation,
    assistant: Assistant
  ): Partial<ChatListItem> & { id: string } {
    if (!chat.isWorkflow) {
      assistantsStore.updateRecentAssistants(assistant)
    }
    // Capture names before updateCurrentChatAssistants may reset assistantData (history.length===1)
    const assistantNameMap = new Map<string, string>([
      ...(chat.assistantData ?? []).map((a): [string, string] => [a.id, a.name]),
      [assistant.id, assistant.name],
    ])
    chatGenerationStore.updateCurrentChatAssistants(chat, assistant)
    const existingListItem = chatsStore.chats.find((c) => c.id === chat.id)
    const mergedAssistantIds = [
      ...new Set([...(existingListItem?.assistantIds ?? []), ...(chat.assistantIds ?? [])]),
    ]
    const mergedAssistantNames = mergedAssistantIds.map((id) => assistantNameMap.get(id) ?? '')
    return {
      assistantIds: mergedAssistantIds,
      assistantNames: mergedAssistantNames,
      date: '',
      id: chat.id,
      initialAssistantId: chat.initialAssistantId ?? '',
      isGroup: mergedAssistantIds.length > 1,
    }
  },

  _updateChatNameIfNeeded(
    chat: Conversation,
    message: string,
    historyIndex: number,
    messageIndex: number
  ): void {
    const isFirstMessage = historyIndex === 0 && messageIndex === 0
    const hasDefaultName = !chat.name || chat.name.trim() === '' || chat.name === 'New chat'

    if (isFirstMessage && hasDefaultName) {
      const newName = message.length > 50 ? message.substring(0, 50) + '...' : message
      chatsStore.updateChat(chat.id, { name: newName })
      // Mask the raw truncated name behind the assistant-name placeholder for
      // the whole generation + rename-poll window, not just the poll part —
      // otherwise it flashes the raw prompt text while the LLM is still
      // streaming, before _pollForRenamedChat ever gets a chance to run.
      // Only relevant when the backend's LLM rename can actually happen —
      // with CHAT_CONTEXTUAL_NAMING_ENABLED off, the truncated name here is
      // already final, so masking it would just hide a correct name behind
      // the placeholder indefinitely.
      if (!chat.isWorkflow && isChatContextualNamingEnabled()) {
        chatsStore.updateChatListItem({ id: chat.id, pendingRename: true })
      }
    }
  },

  // Counterpart to the pendingRename: true set above — for use on paths that
  // abort before _handleStreamResponse's poll kickoff would ever clear it
  // (e.g. the initial request itself failing).
  _clearPendingRenameForFirstMessage(
    chat: Conversation,
    historyIndex: number,
    messageIndex: number
  ): void {
    const isFirstMessage = historyIndex === 0 && messageIndex === 0
    if (isFirstMessage && !chat.isWorkflow) {
      chatsStore.updateChatListItem({ id: chat.id, pendingRename: false })
    }
  },

  _pollForRenamedChat(chatId: string, optimisticName: string, attempt = 0): void {
    const existingTimeoutId = renameChatPollTimeouts.get(chatId)
    if (existingTimeoutId) clearTimeout(existingTimeoutId)

    const delay = Math.min(RENAME_POLL_BASE_DELAY_MS * 1.5 ** attempt, RENAME_POLL_MAX_DELAY_MS)

    const timeoutId = setTimeout(() => {
      renameChatPollTimeouts.delete(chatId)
      chatGenerationStore._checkRenamedChat(chatId, optimisticName, attempt).catch(console.error)
    }, delay)

    renameChatPollTimeouts.set(chatId, timeoutId)
  },

  async _checkRenamedChat(chatId: string, optimisticName: string, attempt: number): Promise<void> {
    // Every exit below either retries or drops the placeholder mask — never both.
    const clearPendingRename = (name?: string) =>
      chatsStore.updateChatListItem({ id: chatId, pendingRename: false, ...(name ? { name } : {}) })

    const listItem = chatsStore.findChat(chatId)
    // Chat was deleted, or something else (manual rename, list refresh)
    // already moved it off the optimistic name — don't fight it. If it's a
    // manual rename, drop the placeholder mask so it's visible immediately.
    if (!listItem) return
    if (listItem.name !== optimisticName) {
      clearPendingRename()
      return
    }

    let fetchedName: string | null = null
    try {
      fetchedName = await chatsStore.getConversationName(chatId)
    } catch (error) {
      console.error(error)
      // A transient fetch error is not "the name hasn't changed" — retry
      // like any other unresolved attempt instead of giving up for good.
      if (attempt + 1 < MAX_RENAME_POLL_ATTEMPTS) {
        chatGenerationStore._pollForRenamedChat(chatId, optimisticName, attempt + 1)
      } else {
        clearPendingRename()
      }
      return
    }

    // Re-check after the async fetch: a manual rename could have landed
    // during the network round-trip above — don't clobber it.
    const currentItem = chatsStore.findChat(chatId)
    if (!currentItem) return
    if (currentItem.name !== optimisticName) {
      clearPendingRename()
      return
    }

    if (fetchedName && fetchedName !== optimisticName) {
      clearPendingRename(fetchedName)
      const openedChat = chatsStore.openedChatsHistory.find((chat) => chat.id === chatId)
      if (openedChat) openedChat.name = fetchedName
      return
    }

    if (attempt + 1 < MAX_RENAME_POLL_ATTEMPTS) {
      chatGenerationStore._pollForRenamedChat(chatId, optimisticName, attempt + 1)
    } else {
      clearPendingRename()
    }
  },

  updateCurrentChatAssistants(chat: Conversation, assistant: Assistant): void {
    if (chat.history.length === 1) {
      chat.assistantIds = []
      chat.assistantData = []
    }
    if (!chat.assistantIds.includes(assistant.id)) {
      chat.assistantIds.unshift(assistant.id)
      chat.assistantData.push({
        id: assistant.id,
        name: assistant.name,
        iconUrl: assistant.icon_url,
        conversationStarters: assistant.conversation_starters,
        context: assistant.context?.map((context) => context.name),
        tools: assistant.tools?.map((tool) => tool.name),
        type: assistant.type,
      })
    } else {
      chat.assistantIds = chat.assistantIds.filter((id) => id !== assistant.id)
      chat.assistantIds.unshift(assistant.id)
    }

    if (assistant.id && !chat.initial_assistant_id && !chat.initialAssistantId) {
      chat.initial_assistant_id = assistant.id
      chat.initialAssistantId = assistant.id
    }
  },

  async editChatGeneration(
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    message: string
  ): Promise<void> {
    await api.put(`v1/conversations/${chatId}/history/${historyIndex}`, { message, messageIndex })
    await chatsStore.getChat(chatId)
  },

  async deleteChatMessage(chatId: string, historyIndex: number): Promise<void> {
    await api.delete(`v1/conversations/${chatId}/history/${historyIndex}`)
    const chat = await chatsStore.getChat(chatId)
    chatsStore.updateChatListItem(chat)
  },

  stopChatGeneration(chatId: string): void {
    const controller = chatGenerationStore.chatAbortControllers[chatId]
    if (controller) {
      controller.abort()
      toaster.error(GENERATION_CANCELLED_MESSAGE)
    }
  },

  /**
   * Sends a structured response to an interactive request as a normal chat turn.
   * The display text becomes the compact user "chip" message in the feed.
   *
   * Re-answering a form works exactly like editing the previous user request:
   * pass `replaceHistoryIndex` (the turn that carried the earlier answer) so the
   * turn is replaced/re-run instead of appending a duplicate answer.
   */
  async submitInteractiveResponse(
    response: InteractiveResponse,
    displayText: string,
    replaceHistoryIndex?: number
  ) {
    const chat = chatsStore.currentChat
    if (!chat) return Promise.resolve()

    // Attribute the follow-up turn to the assistant that ISSUED this request, not
    // merely the last message (which may be a user chip or, in multi-assistant
    // chats, a different assistant). Fall back to the last message with an id.
    const flat = chat.history.flat()
    const owningMessage = flat.find(
      (message) => message.interactiveRequest?.request_id === response.request_id
    )
    const assistantId =
      owningMessage?.assistantId ??
      flat.filter((message) => message.assistantId).at(-1)?.assistantId

    return chatGenerationStore.createChatGeneration({
      message: displayText,
      messageRaw: displayText,
      assistantId,
      interactiveResponse: response,
      ...(Number.isInteger(replaceHistoryIndex) ? { historyIndex: replaceHistoryIndex } : {}),
    })
  },

  async resumeWorkflowExecution(userInput?: string, fileNames?: string[]) {
    const chat = chatsStore.currentChat
    if (!chat) return Promise.resolve()

    chat.isInterrupted = false

    const lastHistoryIndex = chat.history.length - 1
    const lastMessageIndex = chat.history[lastHistoryIndex].length - 1
    const lastHistoryItem = chat.history[lastHistoryIndex][lastMessageIndex]

    lastHistoryItem.thoughts?.forEach((thought) => {
      if (thought.interrupted) thought.interrupted = false
    })

    const lastMessage = chat.history.at(-1)?.at(-1)

    const data: ChatRequest = {
      conversationId: chat.id,
      resumeExecution: true,
      workflowId: lastMessage?.assistantId ?? undefined,
      executionId: lastMessage?.executionId ?? undefined,
      ...(userInput ? { resumeExecutionInput: userInput } : {}),
      ...(fileNames?.length ? { resumeExecutionFileNames: fileNames } : {}),
    } as ChatRequest

    if (userInput) {
      const newHistoryItem: ChatMessage = {
        role: ROLE_USER,
        request: userInput,
        requestRaw: userInput,
        createdAt: new Date().toISOString(),
        inProgress: true,
        assistantId: lastHistoryItem.assistantId,
        assistant: lastHistoryItem.assistant,
        executionId: null,
        ...(fileNames?.length ? { fileNames } : {}),
      }
      chat.history.push([newHistoryItem])
      const newHistoryIndex = chat.history.length - 1
      return chatGenerationStore._sendRequest(chat, newHistoryIndex, 0, data)
    }

    if (fileNames?.length) lastHistoryItem.fileNames = fileNames
    lastHistoryItem.inProgress = true
    return chatGenerationStore._sendRequest(chat, lastHistoryIndex, lastMessageIndex, data)
  },

  async abortWorkflowChat(chatId) {
    try {
      const chat = chatsStore.currentChat
      if (!chat) return

      const lastMessage = chat.history.at(-1)?.at(-1)
      const workflowId = lastMessage?.assistantId
      const executionId = lastMessage?.executionId

      if (!workflowId || !executionId) return

      const response = await api.put(`v1/workflows/${workflowId}/executions/${executionId}/abort`, {
        conversation_id: chatId,
      })

      await chatsStore.getChat(chatId)
      await response.json()
    } catch (error) {
      toaster.error('Failed to abort chat')
      console.error('Failed to abort chat:', error)
      throw error
    }
  },

  async updateWorkflowChatOutput(_chatId, output) {
    const chat = chatsStore.currentChat
    if (!chat) throw new Error('No current chat')

    const lastMessage = chat.history.at(-1)?.at(-1)
    const workflowId = lastMessage?.assistantId
    const executionId = lastMessage?.executionId

    if (!workflowId || !executionId || !lastMessage) {
      throw new Error('No active execution found for this message')
    }

    try {
      const states = await workflowExecutionsStore.getExecutionStates(workflowId, executionId)
      const interruptedState = states?.find((s) => s.status === WORKFLOW_STATUSES.INTERRUPTED)
      if (!interruptedState) {
        throw new Error('No interrupted state found')
      }

      const result = await workflowExecutionsStore.updateWorkflowExecutionStateOutput(
        workflowId,
        executionId,
        interruptedState.id,
        output
      )

      lastMessage.response = output

      return result
    } catch (error) {
      console.error('Failed to update chat output:', error)
      throw error
    }
  },

  getAuthenticatingPromptIds(chatId) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return []

    return getAuthenticatingPromptIdsFromChat(chat)
  },

  async initiatePromptAuth(chatId, historyIndex, messageIndex, mcpConfigId) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return

    const message = getPromptMessage(chat, historyIndex, messageIndex)
    const row = getPromptRows(message).find((item) => item.mcp_config_id === mcpConfigId)

    if (!row?.initiate_url || row.status === 'authenticating' || row.pending_initiate) return

    try {
      const response = await api.post(row.initiate_url.replace(/^\//, ''), {
        mcp_config_id: row.mcp_config_id,
      })
      const payload = (await response.json()) as MCPAuthInitiateResponse

      if (!payload.auth_url) return

      if (row.auth_type === 'oauth2') {
        const pendingInitiate = getPendingInitiate(payload)

        if (!pendingInitiate) {
          toaster.error(MISSING_REDIRECT_HOSTNAME_MESSAGE)
          updatePromptRowsAtIndexes(chat, historyIndex, messageIndex, (rows) =>
            rows.map((item) =>
              item.mcp_config_id === mcpConfigId
                ? {
                    ...item,
                    pending_initiate: null,
                    error_context: MISSING_REDIRECT_HOSTNAME_MESSAGE,
                    recoverable_status: getPromptRecoverableStatus(item),
                  }
                : item
            )
          )
          return
        }

        updatePromptRowsAtIndexes(chat, historyIndex, messageIndex, (rows) =>
          rows.map((item) =>
            item.mcp_config_id === mcpConfigId
              ? {
                  ...item,
                  pending_initiate: pendingInitiate,
                  error_context: null,
                  recoverable_status: getPromptRecoverableStatus(item),
                }
              : item
          )
        )
        return
      }

      window.open(payload.auth_url, '_blank')
      updatePromptRowsAtIndexes(chat, historyIndex, messageIndex, (rows) =>
        rows.map((item) =>
          item.mcp_config_id === mcpConfigId
            ? {
                ...item,
                status: 'authenticating',
                recoverable_status: getPromptRecoverableStatus(item),
              }
            : item
        )
      )
    } catch (error) {
      console.error('Failed to initiate conversation authentication:', error)
    }
  },

  async continuePromptAuth(chatId, historyIndex, messageIndex, mcpConfigId) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return

    updatePromptRowsAtIndexes(chat, historyIndex, messageIndex, (rows) =>
      rows.map((item) => {
        if (item.mcp_config_id !== mcpConfigId || !item.pending_initiate) return item

        const popup = window.open(item.pending_initiate.auth_url, '_blank')

        if (popup === null) {
          return {
            ...item,
            error_context: POPUP_BLOCKED_AUTH_MESSAGE,
            recoverable_status: getPromptRecoverableStatus(item),
          }
        }

        return {
          ...item,
          status: 'authenticating',
          pending_initiate: null,
          error_context: null,
          recoverable_status: getPromptRecoverableStatus(item),
        }
      })
    )
  },

  cancelPromptAuth(chatId, historyIndex, messageIndex, mcpConfigId) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return

    updatePromptRowsAtIndexes(chat, historyIndex, messageIndex, (rows) =>
      rows.map((item) =>
        item.mcp_config_id === mcpConfigId
          ? {
              ...item,
              pending_initiate: null,
            }
          : item
      )
    )
  },

  markPromptAuthSuccess(chatId, authConfigId) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return

    updateAuthenticatingPromptRow(chat, authConfigId, (row) => ({
      ...row,
      status: 'authenticated',
      error_context: null,
    }))
  },

  rollbackPromptAuthRow(chatId, authConfigId, errorContext) {
    const chat = getCurrentChatById(chatId)
    if (!chat || chat.isWorkflow) return

    updateAuthenticatingPromptRow(chat, authConfigId, (row) => ({
      ...row,
      status: getPromptRecoverableStatus(row),
      error_context: errorContext,
    }))
  },

  async _sendRequest(
    chat: Conversation,
    historyIndex: number,
    messageIndex: number,
    data: ChatRequest
  ): Promise<void> {
    const historyItem = chat.history[historyIndex][messageIndex]
    const entityId = historyItem.assistantId ?? (chat as any).assistantID

    const { endpoint, requestData, method } = chatGenerationStore._prepareRequestData(
      chat,
      entityId,
      data
    )

    const abortController = ref(new AbortController())
    const startTime = new Date()

    chatGenerationStore.chatAbortControllers[chat.id] = abortController

    // Handle file conversion if needed (legacy support) - only for non-workflow chats
    if (!chat.isWorkflow && requestData.file) {
      requestData.file_name = requestData.file.name
      requestData.file = await fileToBase64(requestData.file)
    }

    let reader: ReadableStreamDefaultReader | Response

    try {
      reader = await api.stream(endpoint, requestData, abortController, method ?? 'POST')
    } catch (error: any) {
      // pendingRename (set synchronously in _updateChatNameIfNeeded, before this
      // request ever started) is only ever cleared by the rename poll — which is
      // kicked off from _handleStreamResponse and never runs on this failure path.
      // Without this, a failed first message leaves the sidebar stuck on the
      // assistant-name placeholder forever instead of showing the optimistic name.
      chatGenerationStore._clearPendingRenameForFirstMessage(chat, historyIndex, messageIndex)

      const promptRows = parseMCPAuthRequiredErrorPayload(error)

      // MCP auth throws { error: 'authentication_required', servers: [...] }.
      // Bypass _handleGenerationStreamError(), which expects message/details/help fields.
      if (promptRows?.length) {
        applyPromptRows(historyItem, promptRows, startTime)
        return
      }

      chatGenerationStore._handleRequestError(historyItem, error, startTime)
      return
    }

    if (reader instanceof Response) {
      await chatGenerationStore._handleNonStreamResponse(reader, historyItem, chat, startTime)
    } else {
      await chatGenerationStore._handleStreamResponse(reader, historyItem, chat, startTime)
    }
  },

  _prepareRequestData(chat, entityId, data) {
    if (!chat.isWorkflow) {
      return {
        endpoint: `v1/assistants/${entityId}/model`,
        requestData: data,
      }
    }

    if (data.resumeExecution) {
      const hasInput = !!data.resumeExecutionInput
      const hasFiles = !!data.resumeExecutionFileNames?.length
      const requestData =
        hasInput || hasFiles
          ? {
              ...(hasInput ? { user_input: data.resumeExecutionInput } : {}),
              ...(hasFiles ? { file_names: data.resumeExecutionFileNames } : {}),
            }
          : undefined
      return {
        endpoint: `v1/workflows/${data.workflowId}/executions/${data.executionId}/resume?stream=true`,
        requestData,
        method: 'PUT',
      }
    }

    return {
      endpoint: `v1/workflows/${entityId}/executions`,
      requestData: {
        user_input: data.text ?? '',
        file_name: data.file_names?.[0] ?? null,
        stream: true,
        conversation_id: data.conversationId,
      },
    }
  },

  _handleRequestError(historyItem, error, startTime) {
    const errorText = chatGenerationStore._handleGenerationStreamError(error)
    // A rejected interactive submission has its own retry affordance — the form
    // re-activates (or can be re-unlocked via Edit). Remove the optimistic chip turn
    // entirely rather than nulling its interactiveResponse (which would leave a stray
    // plain-text ghost message), and surface the error via a toast instead.
    if (historyItem.interactiveResponse) {
      chatGenerationStore._removeOptimisticTurn(historyItem)
      toaster.error(errorText)
      return
    }
    historyItem.response = errorText
    historyItem.loginUrl = error?.error?.login_url ?? error?.login_url
    historyItem.mcpAuthPromptRows = null
    finalizeFailedRequest(historyItem, startTime)
  },

  /** Remove an optimistically-added turn (by identity) from the current chat, and
   *  drop its group if it becomes empty. Used to roll back a failed interactive
   *  submission cleanly. */
  _removeOptimisticTurn(historyItem: ChatMessage): void {
    const chat = chatsStore.currentChat
    if (!chat) return
    for (let groupIndex = chat.history.length - 1; groupIndex >= 0; groupIndex -= 1) {
      const messageIndex = chat.history[groupIndex].indexOf(historyItem)
      if (messageIndex === -1) continue
      chat.history[groupIndex].splice(messageIndex, 1)
      if (chat.history[groupIndex].length === 0) chat.history.splice(groupIndex, 1)
      return
    }
  },

  async _handleNonStreamResponse(reader, historyItem, chat, startTime) {
    historyItem.inProgress = false

    if (!reader.ok) return

    const endTime = new Date()

    try {
      const data = await reader.json()
      historyItem.response = data.generated
      historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
      historyItem.stream = null
      chatGenerationStore._finishThoughts(historyItem)
    } catch (error) {
      console.error('Failed to parse response JSON:', error)
    }

    if (chat.isWorkflow) chatsStore.getChat(chat.id)
  },

  async _handleStreamResponse(reader, historyItem, chat, startTime) {
    const response = await chatGenerationStore._handleGenerationStream(historyItem, reader)

    const endTime = new Date()

    // Assigned for every finalized turn, not only for the ones that produced text: an
    // interactive-only response has no text but still needs its "Processed in" metadata,
    // and its terminal chunk carries `last`. A stream that ended without a terminal chunk
    // (server-side cut, proxy timeout) never finished, so it stays unlabelled.
    if (response?.last || response?.generated || response?.capturedStreamText) {
      historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
    }

    if (response?.generated) {
      historyItem.response = response.generated
      historyItem.debug = response.debug
    } else if (response?.capturedStreamText) {
      historyItem.response = response.capturedStreamText
    }

    historyItem.inProgress = false
    historyItem.stream = null
    chatGenerationStore._finishThoughts(historyItem)

    if (chat.isWorkflow) {
      if (response?.workflow_execution_id) {
        historyItem.executionId = response.workflow_execution_id
      }
      await chatsStore.refreshWorkflowExecutionIds(chat.id).catch(console.error)
      chat.isInterrupted = response?.workflow_state?.event_type === WORKFLOW_STATE_EVENT_INTERRUPTED
    }

    // The LLM-generated name (EPMCDME-11647) lands seconds after the stream
    // closes, via a backend BackgroundTasks rename — poll for it rather than
    // leaving the optimistic truncated name displayed indefinitely.
    const isFirstMessage = chat.history[0]?.[0] === historyItem
    if (isFirstMessage && !chat.isWorkflow && chat.name && isChatContextualNamingEnabled()) {
      // pendingRename was already set true in _updateChatNameIfNeeded, before
      // the stream started — this just picks up polling for the real name.
      chatGenerationStore._pollForRenamedChat(chat.id, chat.name)
    }
  },

  async _handleGenerationStream(
    historyItem: ChatMessage,
    reader: ReadableStreamDefaultReader
  ): Promise<any> {
    historyItem.stream = new Stream()
    const state: StreamDrainState = {
      cachedValue: '',
      response: {},
      receivedFinalChunk: false,
      notificationTimeoutId: null,
    }

    /* eslint-disable no-constant-condition */
    while (true) {
      try {
        /* eslint-disable no-await-in-loop */
        const { done, value } = await reader.read()

        if (done) break

        // Keep draining the reader to `done` even after the final chunk is
        // received, so the HTTP response completes normally server-side and
        // any server-side response.background hook (e.g. FastAPI
        // BackgroundTasks) reliably runs.
        if (!state.receivedFinalChunk) {
          await chatGenerationStore._processStreamChunk(historyItem, value, state)
        }
      } catch (error: any) {
        // If we already received the final chunk, state.response is complete —
        // a drain-phase error (e.g. connection drop or user abort while waiting for `done`)
        // must not discard an already-successful generation.
        if (state.receivedFinalChunk) {
          console.error(error.name)
          break
        }

        // Request was aborted by user (before final chunk received)
        if (error.name === ABORT_ERROR) {
          return chatGenerationStore._handleGenerationAbort(historyItem, reader)
        }

        console.error(error.name)
        throw error
      }
    }

    chatGenerationStore._clearWaitingNotification(historyItem)
    return state.response
  },

  async _processStreamChunk(
    historyItem: ChatMessage,
    value: string,
    state: StreamDrainState
  ): Promise<void> {
    if (!historyItem?.stream?.isStreaming) historyItem.stream?.start()

    const { finalChunk, incompleteChunk } = await chatGenerationStore._handleChunk(
      historyItem,
      state.cachedValue + value
    )

    chatGenerationStore._clearWaitingNotification(historyItem, state.notificationTimeoutId!)
    state.notificationTimeoutId = chatGenerationStore._scheduleWaitingNotification(historyItem)

    if (incompleteChunk) {
      state.cachedValue = incompleteChunk
      return
    }

    if (finalChunk) {
      state.response = finalChunk
      state.receivedFinalChunk = true
      state.cachedValue = ''
      return
    }

    state.cachedValue = ''
  },

  _scheduleWaitingNotification(historyItem: ChatMessage): NodeJS.Timeout {
    return setTimeout(() => {
      if (!historyItem.stream) return
      historyItem.stream.notification = STREAMING_NOTIFICATION
    }, STREAMING_NOTIFICATION_INTERVAL)
  },

  _clearWaitingNotification(historyItem: ChatMessage, timeoutId?: NodeJS.Timeout): void {
    if (timeoutId) clearTimeout(timeoutId)
    if (historyItem.stream) {
      historyItem.stream.notification = null
    }
  },

  async _handleChunk(
    historyItem: ChatMessage,
    value: string
  ): Promise<{ finalChunk: any; incompleteChunk: string | null }> {
    const { chunkObjects, incompleteChunk } = streamChunkToObject(value)

    for (const chunk of chunkObjects) {
      if (chunk.interactive_request) {
        historyItem.interactiveRequest = chunk.interactive_request
      } else if (chunk.thought) {
        chatGenerationStore._handleThought(historyItem, chunk.thought)
      } else {
        historyItem.stream?.push(chunk.generated_chunk ?? '')
      }

      // Termination is decided by the chunk's `last` flag alone, independently of what the
      // chunk carries — a terminal chunk that also holds an interactive request still ends
      // the stream.
      if (chunk.last) {
        const streamRef = historyItem.stream as Stream | null
        const capturedStreamText = (streamRef?.stream ?? '') + (streamRef?.streamBuffer ?? '')
        historyItem.stream?.finish()
        historyItem.inProgress = false
        return {
          finalChunk: capturedStreamText ? { ...chunk, capturedStreamText } : chunk,
          incompleteChunk: null,
        }
      }
    }

    return { finalChunk: null, incompleteChunk }
  },

  _handleThought(historyItem: ChatMessage, thought: Partial<Thought>): void {
    if (!historyItem.thoughts) historyItem.thoughts = []

    const existingThought = chatGenerationStore._findThought(historyItem.thoughts, thought.id!)

    if (existingThought) {
      existingThought.message += thought.message ?? ''
      existingThought.input_text = thought.input_text ?? existingThought.input_text
      existingThought.author_name = thought.author_name ?? existingThought.author_name
      existingThought.tool_name = thought.tool_name ?? existingThought.tool_name
      existingThought.author_type = thought.author_type ?? existingThought.author_type
      existingThought.output_format = thought.output_format ?? existingThought.output_format
      existingThought.parent_id = thought.parent_id ?? existingThought.parent_id
      existingThought.children = thought.children?.length
        ? thought.children
        : existingThought.children
      existingThought.in_progress = thought.in_progress ?? existingThought.in_progress
      existingThought.error = thought.error ?? existingThought.error
      existingThought.interrupted = thought.interrupted ?? existingThought.interrupted
      existingThought.aborted = thought.aborted ?? existingThought.aborted
    } else {
      let existingParentThought = historyItem.thoughts.find((item) => {
        return item.id === thought.parent_id
      })

      if (thought.parent_id === 'latest') {
        existingParentThought = historyItem.thoughts[historyItem.thoughts.length - 1]
      }

      if (existingParentThought) {
        existingParentThought.children = existingParentThought.children ?? []
        existingParentThought.children.push(thought as Thought)
      } else {
        chatGenerationStore._finishThoughts(historyItem)
        historyItem.thoughts.push(thought as Thought)
      }
    }
  },

  _findThought(thoughts: Thought[], targetId: string): Thought | null {
    let foundThought: Thought | null = null

    thoughts.forEach((thought) => {
      if (thought.id === targetId) {
        foundThought = thought
      }
      if (thought.children && thought.children.length > 0 && !foundThought) {
        const foundInChildren = chatGenerationStore._findThought(thought.children, targetId)
        if (foundInChildren) {
          foundThought = foundInChildren
        }
      }
    })

    return foundThought
  },

  _handleGenerationStreamError(errorObj: any): string {
    if (errorObj.name === ABORT_ERROR) return EMPTY_MESSAGE

    try {
      const { message, details, help } = errorObj.error ?? errorObj
      return `${DEFAULT_ERROR_MESSAGE} \n ${message}: ${details} \n ${help}`
    } catch (e: any) {
      return `${DEFAULT_ERROR_MESSAGE}: ${e.message}`
    }
  },

  _finishThoughts(historyItem: ChatMessage): void {
    finishThoughts(historyItem)
  },

  _handleGenerationAbort(historyItem: ChatMessage, _reader: ReadableStreamDefaultReader): any {
    const generated = historyItem.stream?.getStream()

    historyItem.stream?.finish()
    historyItem.inProgress = false
    chatGenerationStore._finishThoughts(historyItem)

    return {
      generated: generated ?? EMPTY_MESSAGE,
    }
  },
})
