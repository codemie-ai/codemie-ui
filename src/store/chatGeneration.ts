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

import { ChatRequest, HistoryMessage, ChatGenerationOptions } from '@/types/chatGeneration'
import { Assistant } from '@/types/entity/assistant'
import { Conversation, ChatMessage, Thought } from '@/types/entity/conversation'
import api, { ABORT_ERROR, DEFAULT_ERROR_MESSAGE } from '@/utils/api'
import { transformChatHistoryFEtoBE } from '@/utils/chatHelpers'
import { fileToBase64 } from '@/utils/helpers'
import Stream, { streamChunkToObject } from '@/utils/stream'
import toaster from '@/utils/toaster'

import { assistantsStore } from './assistants'
import { chatsStore } from './chats'
import { workflowExecutionsStore } from './workflowExecutions'

const STREAMING_NOTIFICATION = 'Still waiting for response, agent is thinking'
const STREAMING_NOTIFICATION_INTERVAL = 5_000 // 5 seconds
const ASSISTANT_NOT_FOUND =
  'Assistant you are trying to reach is not found. Please mention another one using @mention.'
const EMPTY_MESSAGE = '/Empty message/'

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
  resumeWorkflowExecution: () => Promise<void>
  abortWorkflowChat: (chatId: string) => Promise<void>
  updateWorkflowChatOutput: (chatId: string, output: string) => Promise<void>

  // Private methods
  _getAssistant: (assistantId: string | undefined) => Promise<Assistant>
  _getWorkflowAsAssistant: (workflowId: string | undefined, chat: Conversation) => Assistant
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
  _updateChatMetadata: (chat: Conversation, assistant: Assistant) => void
  _updateChatNameIfNeeded: (
    chat: Conversation,
    message: string,
    historyIndex: number,
    messageIndex: number
  ) => void
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
  ) => { endpoint: string; requestData?: any }
  _handleRequestError: (historyItem: ChatMessage, error: any, startTime: Date) => void
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
    } = options
    const fileNames = files?.length ? files : null
    let { historyIndex = null, messageIndex = null } = options

    const chat = chatsStore.currentChat
    if (!chat) {
      toaster.error('No chat available')
      return Promise.reject(new Error('No current chat'))
    }

    // For workflow chats, don't fetch assistant data
    const assistant = chat.isWorkflow
      ? chatGenerationStore._getWorkflowAsAssistant(assistantId, chat)
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
    }

    const historyItem = chatGenerationStore._createHistoryItem(
      message,
      messageRaw,
      assistantId!,
      fileNames,
      assistant
    )

    const indexes = chatGenerationStore._addMessageToHistory(
      chat,
      historyItem,
      historyIndex,
      messageIndex
    )
    historyIndex = indexes.historyIndex
    messageIndex = indexes.messageIndex

    chatGenerationStore._updateChatMetadata(chat, assistant)
    chatGenerationStore._updateChatNameIfNeeded(chat, message, historyIndex, messageIndex)

    return chatGenerationStore._sendRequest(chat, historyIndex, messageIndex, data)
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

  _getWorkflowAsAssistant(workflowId: string | undefined, chat: Conversation): Assistant {
    if (!workflowId) {
      toaster.error('No workflow ID provided')
      throw new Error('No workflow ID provided')
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
      role: 'User',
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

  _updateChatMetadata(chat: Conversation, assistant: Assistant): void {
    if (!chat.isWorkflow) {
      assistantsStore.updateRecentAssistants(assistant)
    }
    chatGenerationStore.updateCurrentChatAssistants(chat, assistant)
    chatsStore.updateChatListItem({
      assistantIds: chat.assistantIds,
      date: '',
      folder: chat.folder ?? '',
      id: chat.id,
      initialAssistantId: chat.initialAssistantId ?? '',
      isGroup: !!chat.isGroup,
      name: chat.name ?? '',
      pinned: !!chat.pinned,
    })
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
      toaster.error('Completion generation has been cancelled')
    }
  },

  async resumeWorkflowExecution() {
    const chat = chatsStore.currentChat
    if (!chat) return Promise.resolve()

    const historyIndex = chat.history.length - 1
    const messageIndex = chat.history[historyIndex].length - 1

    chat.history[historyIndex][messageIndex].thoughts?.forEach((thought) => {
      if (thought.interrupted) thought.interrupted = false
    })

    const data: ChatRequest = {
      conversationId: chat.id,
      resumeExecution: true,
    } as ChatRequest

    return chatGenerationStore._sendRequest(chat, historyIndex, messageIndex, data)
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

  async updateWorkflowChatOutput(chatId, output) {
    try {
      const chat = chatsStore.currentChat
      if (!chat) return

      const lastMessage = chat.history.at(-1)?.at(-1)
      const workflowId = lastMessage?.assistantId
      const executionId = lastMessage?.executionId

      if (!workflowId || !executionId) return

      const interruptedThought = lastMessage?.thoughts?.find((t: any) => t.interrupted)
      if (!interruptedThought) return

      const states = await workflowExecutionsStore.getExecutionStates(workflowId, executionId)
      const stateId = states?.find((s) => s.name === interruptedThought.author_name)?.id
      if (!stateId) return

      await workflowExecutionsStore.updateWorkflowExecutionStateOutput(
        workflowId,
        executionId,
        stateId,
        output
      )
      await chatsStore.getChat(chatId)
    } catch (error) {
      toaster.error('Failed to update chat output')
      console.error('Failed to update chat output:', error)
      throw error
    }
  },

  async _sendRequest(
    chat: Conversation,
    historyIndex: number,
    messageIndex: number,
    data: ChatRequest
  ): Promise<void> {
    const historyItem = chat.history[historyIndex][messageIndex]
    const entityId = historyItem.assistantId ?? (chat as any).assistantID

    const { endpoint, requestData } = chatGenerationStore._prepareRequestData(chat, entityId, data)

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
      reader = await api.stream(endpoint, requestData, abortController, 'POST')
    } catch (error: any) {
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
      return {
        endpoint: `v1/conversations/${data.conversationId}/resume`,
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
    historyItem.response = chatGenerationStore._handleGenerationStreamError(error)
    historyItem.loginUrl = error?.error?.login_url ?? error?.login_url
    historyItem.inProgress = false
    historyItem.stream = null
    chatGenerationStore._finishThoughts(historyItem)

    const endTime = new Date()
    historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
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

    if (response?.generated) {
      historyItem.response = response.generated
      historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
      historyItem.debug = response.debug
    }

    historyItem.inProgress = false
    historyItem.stream = null
    chatGenerationStore._finishThoughts(historyItem)

    if (chat.isWorkflow) chatsStore.refreshWorkflowExecutionIds(chat.id).catch(console.error)
  },

  async _handleGenerationStream(
    historyItem: ChatMessage,
    reader: ReadableStreamDefaultReader
  ): Promise<any> {
    historyItem.stream = new Stream()
    let cachedValue = ''
    let response: any = {}
    let notificationTimeoutId: NodeJS.Timeout | null = null

    /* eslint-disable no-constant-condition */
    while (true) {
      try {
        /* eslint-disable no-await-in-loop */
        const { done, value } = await reader.read()

        if (done) break

        if (!historyItem?.stream?.isStreaming) historyItem.stream?.start()

        const { finalChunk, incompleteChunk } = await chatGenerationStore._handleChunk(
          historyItem,
          cachedValue + value
        )

        chatGenerationStore._clearWaitingNotification(historyItem, notificationTimeoutId!)
        notificationTimeoutId = chatGenerationStore._scheduleWaitingNotification(historyItem)

        if (incompleteChunk) {
          cachedValue = incompleteChunk
          /* eslint-disable no-continue */
          continue
        }

        if (finalChunk) {
          response = finalChunk
          break
        }

        cachedValue = ''
      } catch (error: any) {
        // Request was aborted by user
        if (error.name === ABORT_ERROR) {
          return chatGenerationStore._handleGenerationAbort(historyItem, reader)
        }

        console.error(error.name)
        throw error
      }
    }

    chatGenerationStore._clearWaitingNotification(historyItem)
    return response
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
      if (chunk.thought) {
        chatGenerationStore._handleThought(historyItem, chunk.thought)
      } else {
        historyItem.stream?.push(chunk.generated_chunk ?? '')

        if (chunk.last) {
          historyItem.stream?.finish()
          historyItem.inProgress = false
          return { finalChunk: chunk, incompleteChunk: null }
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
      existingThought.children = thought.children?.length
        ? thought.children
        : existingThought.children
      existingThought.in_progress = thought.in_progress ?? existingThought.in_progress
      existingThought.error = thought.error ?? existingThought.error
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
    if (!historyItem.thoughts) return

    historyItem.thoughts.forEach((thought, index) => {
      thought.in_progress = false
      historyItem.thoughts![index] = thought
    })
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
