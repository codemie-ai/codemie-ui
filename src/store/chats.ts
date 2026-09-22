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

import { proxy } from 'valtio'

import {
  CHAT_POLL_INTERVAL_MS,
  DEFAULT_CHAT_FOLDER,
  MAX_CHAT_POLL_ATTEMPTS,
} from '@/constants/chats'
import { router } from '@/hooks/useVueRouter'
import {
  AssistantFolderDeleteAction,
  AssistantFolderDeleteResponse,
  AssistantFolderListItem,
  SearchResultItem,
  ChatExportFormat,
  RecentChat,
} from '@/types/chats'
import {
  Conversation,
  ChatFolder,
  ChatListItem,
  ChatMetrics,
  FeedbackSubmission,
  FolderListItem,
} from '@/types/entity'
import api, { sanitizeFileName } from '@/utils/api'
import { transformChatBEtoFE } from '@/utils/chatHelpers'
import { chatSkillsKey, removeChatStorage, sweepOrphanedChatKeys } from '@/utils/chatStorageUtils'
import storage from '@/utils/storage'
import toaster from '@/utils/toaster'
import { getRootPath } from '@/utils/utils'

import { moveOrderStore } from './moveOrder'
import { pinOrderStore } from './pinOrder'
import { premiumModelTipStore } from './premiumModelTip'
import { recentChatsStore } from './recentChats'
import { userStore } from './user'
import {
  getChatBEMessageIndex,
  transformChatListItemDTOs,
  transformFolderListItemsDTOs,
} from './utils/chats'
import { workflowExecutionsStore } from './workflowExecutions'

const mapConversationUpdatePayload = (data: Partial<Conversation>) => {
  const payload: Record<string, unknown> = {}

  Object.entries(data).forEach(([key, value]) => {
    switch (key) {
      case 'llmModel':
        payload.llm_model = value
        break
      case 'enableImageGeneration':
        payload.enable_image_generation = value
        break
      case 'imageGenerationModel':
        payload.image_generation_model = value
        break
      case 'toolCallPolicy':
        payload.tool_call_policy = value
        break
      default:
        payload[key] = value
    }
  })

  return payload
}

const LAST_CHAT_ID = 'last-chat-id'
const chatPollTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const getAssistantFolderChats = (chats: ChatListItem[], assistantId: string) =>
  chats.filter(
    (chat) =>
      (chat.initialAssistantId === assistantId ||
        (!chat.initialAssistantId && chat.assistantIds?.includes(assistantId))) &&
      !chat.folder &&
      !chat.isWorkflow &&
      chat.importSource == null &&
      !chat.pinned
  )

const deleteConversations = (conversationIds: string[]) =>
  Promise.all(conversationIds.map((id) => api.delete(`v1/conversations/${id}`)))

const parseAssistantFolderDeleteResponse = async (
  response: Response,
  fallback: AssistantFolderDeleteResponse
) => {
  if (typeof response.text === 'function') {
    const responseBody = await response.text()
    return responseBody.trim()
      ? (JSON.parse(responseBody) as AssistantFolderDeleteResponse)
      : fallback
  }
  return typeof response.json === 'function'
    ? ((await response.json()) as AssistantFolderDeleteResponse)
    : fallback
}

const deleteRegisteredAssistantFolder = async (
  assistantId: string,
  action: AssistantFolderDeleteAction,
  fallback: AssistantFolderDeleteResponse
): Promise<AssistantFolderDeleteResponse | null> => {
  try {
    const response = await api.delete(
      `v1/assistant-folders/${encodeURIComponent(assistantId)}`,
      undefined,
      { params: { remove_conversations: true }, skipErrorHandling: true }
    )
    const deleted = await parseAssistantFolderDeleteResponse(response, fallback)
    // Both actions delete the chats. They differ only in whether the emptied folder stays
    // listed, which the backend cannot decide for us: its folders are derived from the chats,
    // so once the chats are gone the folder is gone too unless the sidebar keeps showing it.
    return { ...deleted, folder_deleted: action === 'delete_folder_and_chats' }
  } catch (error) {
    if (error instanceof Response && error.status === 404) return null
    toaster.error('Failed to delete assistant folder')
    throw error
  }
}

const getFallbackAssistantFolder = (
  assistantId: string,
  chats: ChatListItem[]
): AssistantFolderListItem => {
  const firstChat = chats[0]
  const assistantIndex = firstChat?.assistantIds?.indexOf(assistantId) ?? -1
  return {
    assistant_id: assistantId,
    name:
      (assistantIndex >= 0 ? firstChat?.assistantNames?.[assistantIndex] : undefined) ??
      firstChat?.assistantNames?.[0] ??
      assistantId,
    icon_url: firstChat?.iconUrl,
  }
}

interface MoveChatToFolderOptions {
  successMessage?: string
}

interface NewChatParams {
  assistantId: string
  folder: string
  isWorkflow: boolean
}

let chatsAndFoldersRefreshCount = 0

const refreshChatsAndFolders = async () => {
  chatsAndFoldersRefreshCount += 1
  chatsStore.isChatsAndFoldersRefreshing = true
  try {
    const results = await Promise.allSettled([chatsStore.getFolders(), chatsStore.getChats()])
    const rejectedResult = results.find((result) => result.status === 'rejected')
    if (rejectedResult) throw rejectedResult.reason
  } finally {
    chatsAndFoldersRefreshCount -= 1
    chatsStore.isChatsAndFoldersRefreshing = chatsAndFoldersRefreshCount > 0
  }
}

export interface ChatsStoreType {
  // State
  metrics: ChatMetrics | null
  isChatsLoading: boolean
  chats: ChatListItem[]
  chatFolders: FolderListItem[]
  assistantFolders: AssistantFolderListItem[]
  currentChat: Conversation | null
  openedChatsHistory: Conversation[]
  abortControllers: Record<string, AbortController>
  isInitialDataFetched: boolean
  isChatsAndFoldersRefreshing: boolean
  isMovingChatsToFolder: boolean
  isNewChat: boolean
  newChatParams: NewChatParams | null

  // Chat management methods
  getLastChat(): string | null
  getChats(): Promise<ChatListItem[]>
  findChat(id: string): ChatListItem | undefined
  getChat(id: string, options?: { saveAsRecent?: boolean }): Promise<Conversation>
  pollIncompleteChat(id: string): void
  stopChatCompletionPoll(id: string): void
  getSharedChat(token: string): Promise<Conversation>
  searchChats(query: string, signal?: AbortSignal): Promise<SearchResultItem[]>
  setOpenChat(newChat: Conversation, saveToOpenedChatsHistory?: boolean): Conversation
  clearCurrentChat(): void
  startNewChat(assistantId?: string, folder?: string, isWorkflow?: boolean): Promise<Conversation>
  createChat(): Promise<Conversation>
  createChat(assistantId?: string, folder?: string, isWorkflow?: boolean): Promise<Conversation>
  pinChat(id: string): Promise<void>
  renameChat(id: string, name: string): Promise<void>
  updateChat(id: string, data: Partial<Conversation>): Promise<any>
  updateChatWithAssistantData(assistant: any): void
  deleteChat(id: string): Promise<any>
  exportChat(format: ChatExportFormat): any
  shareChat(chatId: string): Promise<string | null>
  clearChatHistory(chatId: string): Promise<void>
  deleteAllConversations(): Promise<void>
  exportConversationAIMessage(
    chatId: string,
    historyIndex: number,
    messageIndex: number,
    format: string
  ): Promise<any>
  updateChatListItem(newChatListItem: Partial<ChatListItem> & { id: string }): void
  refreshWorkflowExecutionIds(id: string): Promise<void>
  getConversationName(id: string): Promise<string | null>

  // Folder management methods
  createFolder(folder: string): Promise<any>
  getFolders(): Promise<ChatFolder[]>
  getAssistantFolders(): Promise<AssistantFolderListItem[]>
  deleteAssistantFolder(
    assistantId: string,
    action: AssistantFolderDeleteAction
  ): Promise<AssistantFolderDeleteResponse>
  deleteChatFolder(folder: string, deleteChats?: boolean, localUpdate?: boolean): Promise<void>
  renameChatFolder(oldFolder: string, newFolder: string): Promise<void>
  moveChatToFolder(
    chatId: string,
    targetFolder: string,
    options?: MoveChatToFolderOptions
  ): Promise<void>
  moveChatsToFolder(chatIds: string[], targetFolder: string): Promise<void>

  // Additional features
  getMetrics(chatId: string): Promise<ChatMetrics>
  recognizeSpeech(audioBlob: Blob): Promise<{ message?: string }>

  // Feedback methods
  submitFeedback(
    conversationId: string,
    feedbackData: Partial<FeedbackSubmission>,
    historyIndex: number,
    messageIndex: number
  ): Promise<void>
  deleteFeedback(
    conversationId: string,
    assistantId: string,
    feedbackId: string | number,
    historyIndex: number,
    messageIndex: number
  ): Promise<void>

  // ===== Recent Chats Methods =====
  getRecentChats(): RecentChat[]
  addRecentChat(chat: Omit<RecentChat, 'openedAt'>): void
}

export const chatsStore = proxy<ChatsStoreType>({
  chats: [],
  chatFolders: [],
  assistantFolders: [],
  currentChat: null,
  openedChatsHistory: [],
  metrics: null,
  isChatsLoading: false,
  isInitialDataFetched: false,
  isChatsAndFoldersRefreshing: false,
  isMovingChatsToFolder: false,
  isNewChat: false,
  newChatParams: null,
  abortControllers: {},

  getLastChat() {
    return storage.get(userStore.user!.userId, LAST_CHAT_ID) as unknown as string
  },

  getChats: async () => {
    if (!chatsStore.isInitialDataFetched) chatsStore.isChatsLoading = true
    try {
      const response = await api.get('v1/conversations')
      const chats = transformChatListItemDTOs(await response.json())
      chatsStore.chats = chats
      const userId = userStore.user?.userId
      if (userId)
        sweepOrphanedChatKeys(
          userId,
          chats.map((c) => c.id)
        )
      // One-time backfill: a chat pinned before pinOrderStore existed has no recorded pin
      // timestamp yet. Without this, its Pinned-section position would fall back to its live
      // updateDate indefinitely, letting real activity reorder Pinned for exactly these chats.
      for (const chat of chats) {
        if (chat.pinned) pinOrderStore.ensurePinOrder(chat.id, chat.updateDate ?? chat.date)
      }
      return chats
    } finally {
      chatsStore.isChatsLoading = false
      chatsStore.isInitialDataFetched = true
    }
  },

  findChat: (id) => {
    return chatsStore.chats.find((chat) => chat.id === id)
  },

  searchChats: async (query, signal) => {
    const response = await api.get('v1/conversations/search', {
      params: { query },
      signal,
    })

    const data = await response.json()
    return data.items.map((v: SearchResultItem) => ({ ...v, name: v.name || 'New chat' }))
  },

  getChat: async (id, options) => {
    const response = await api.get(`v1/conversations/${id}`)
    const chat = transformChatBEtoFE(await response.json())
    storage.put(userStore.user?.userId ?? '', LAST_CHAT_ID, id)

    if (options?.saveAsRecent) {
      chatsStore.addRecentChat({
        id: chat.id,
        name: chat.name,
        folder: chat.folder,
      })
    }

    const openedChat = chatsStore.setOpenChat(chat)

    const hasInProgress = chat.history.some((group) => group.some((msg) => msg.inProgress))
    if (hasInProgress) {
      if (!chat.isWorkflow && openedChat) {
        import('./chatGeneration').then(({ chatGenerationStore }) => {
          chatGenerationStore.reconnectChatStream(openedChat)
        })
      } else {
        chatsStore.pollIncompleteChat(id)
      }
    }

    return openedChat
  },

  stopChatCompletionPoll(id: string): void {
    if (chatPollTimeouts.has(id)) {
      clearTimeout(chatPollTimeouts.get(id))
      chatPollTimeouts.delete(id)
    }
  },

  pollIncompleteChat(id) {
    chatsStore.stopChatCompletionPoll(id)

    let attempt = 0

    const poll = async () => {
      attempt += 1
      const activeChat =
        chatsStore.openedChatsHistory.find((chat) => chat.id === id) ||
        (chatsStore.currentChat?.id === id ? chatsStore.currentChat : null)
      if (!activeChat || attempt > MAX_CHAT_POLL_ATTEMPTS) {
        chatPollTimeouts.delete(id)
        return
      }

      try {
        const response = await api.get(`v1/conversations/${id}`)
        const freshChat = transformChatBEtoFE(await response.json())

        const stillInProgress = freshChat.history.some((group) =>
          group.some((msg) => msg.inProgress)
        )

        const existingChat = chatsStore.openedChatsHistory.find((chat) => chat.id === id)
        if (existingChat) {
          existingChat.history = freshChat.history
          existingChat.isInterrupted = freshChat.isInterrupted
        }
        if (chatsStore.currentChat?.id === id) {
          chatsStore.currentChat.history = freshChat.history
          chatsStore.currentChat.isInterrupted = freshChat.isInterrupted
        }

        if (stillInProgress && attempt < MAX_CHAT_POLL_ATTEMPTS) {
          const timeoutId = setTimeout(poll, CHAT_POLL_INTERVAL_MS)
          chatPollTimeouts.set(id, timeoutId)
        } else {
          chatPollTimeouts.delete(id)
          chatsStore.updateChatListItem(freshChat)
        }
      } catch (err) {
        console.error(`Error polling incomplete chat ${id}:`, err)
        chatPollTimeouts.delete(id)
      }
    }

    const timeoutId = setTimeout(poll, CHAT_POLL_INTERVAL_MS)
    chatPollTimeouts.set(id, timeoutId)
  },

  /**
   * Refreshes workflow execution identity and progress from GET conversation
   * without `setOpenChat` (which ignores payloads while a message is in progress).
   */
  refreshWorkflowExecutionIds: async (id) => {
    const response = await api.get(`v1/conversations/${id}`)
    const freshChat = transformChatBEtoFE(await response.json())

    const existingChat = chatsStore.openedChatsHistory.find((chat) => chat.id === id)
    if (!existingChat) return

    existingChat.isInterrupted = freshChat.isInterrupted

    freshChat.history.forEach((historyGroup, historyIndex) => {
      historyGroup.forEach((message, messageIndex) => {
        const conversation = existingChat.history[historyIndex]
        const existingMessage = conversation?.[messageIndex]
        if (!existingMessage) return

        existingMessage.executionId = message.executionId
        existingMessage.workflowExecutionRef = message.workflowExecutionRef
        // Live SSE owns the thought tree; GET hydrate uses different ids/names
        // and would duplicate step cards if applied mid-stream.
        if (existingMessage.stream) {
          existingMessage.executionStatus = message.executionStatus
          return
        }
        // Stop on this page froze the turn; keep local progress hidden until reload.
        if (existingMessage.generationStopped) return
        // Stream already finished locally; a lagging In Progress GET must not
        // resurrect step cards or wipe thoughts while the message is still empty.
        if (existingMessage.response && !message.response) {
          existingMessage.inProgress = false
          return
        }
        existingMessage.executionStatus = message.executionStatus
        existingMessage.response = message.response
        existingMessage.inProgress = message.inProgress
        existingMessage.thoughts = message.thoughts ?? []
      })
    })
  },

  /**
   * Reads a conversation's current name without the `setOpenChat` side effects
   * `getChat` has (which would force-switch `currentChat` if the caller has
   * since navigated away) — safe to poll for a chat that isn't open anymore.
   */
  getConversationName: async (id) => {
    const response = await api.get(`v1/conversations/${id}`)
    const data = await response.json()
    return data.conversation_name ?? null
  },

  getSharedChat: async (token) => {
    const response = await api.get(`v1/share/conversations/${token}`)
    const chat = (await response.json()).conversation
    const chatFE = transformChatBEtoFE(chat)
    return chatsStore.setOpenChat(chatFE, false)
  },

  setOpenChat: (newChat, saveToOpenedChatsHistory = true) => {
    const existingChat = chatsStore.openedChatsHistory.find((chat) => chat.id === newChat.id)
    const isMessagePending = (message: any): boolean =>
      // A turn that is still streaming, OR one that finalized into an auth gate. The gate
      // fields (gitlab/jira/confluence/mcp) are reconstructed client-side from a
      // `*_connect_required` / `authentication_required` error and are never persisted, so a
      // late `getChat` refetch would return a gate-less history and silently drop the prompt
      // the user still has to act on. Treat a pending gate like in-progress: keep the local copy.
      Boolean(
        message.inProgress ||
          message.gitlabAuthPrompt ||
          message.jiraAuthPrompt ||
          message.confluenceAuthPrompt ||
          message.mcpAuthPromptRows?.length
      )
    const hasMessagesInProgress =
      existingChat?.history.reduce(
        (acc: boolean, messages: any[]) => acc || messages.some(isMessagePending),
        false
      ) ?? false

    if (hasMessagesInProgress) {
      chatsStore.currentChat = existingChat!
    } else if (existingChat) {
      Object.assign(existingChat, newChat)
      chatsStore.currentChat = existingChat
    } else {
      if (saveToOpenedChatsHistory) chatsStore.openedChatsHistory.push(newChat)
      chatsStore.currentChat = newChat
    }
    return chatsStore.currentChat
  },

  clearCurrentChat: () => {
    chatsStore.currentChat = null
  },

  startNewChat: async (assistantId = '', folder = '', isWorkflow = false) => {
    const folderValue = folder === DEFAULT_CHAT_FOLDER ? '' : folder

    const params = new URLSearchParams()
    if (assistantId) params.set('initial_assistant_id', assistantId)
    if (folderValue) params.set('folder', folderValue)
    params.set('is_workflow', String(isWorkflow))

    const templateResponse = await api.get(`v1/conversations/new?${params.toString()}`)
    const fullChatDto = await templateResponse.json()

    const newConversation = transformChatBEtoFE(fullChatDto)

    newConversation.id = ''

    chatsStore.isNewChat = true
    // Every new chat re-arms the premium tip: a dismissal on the previous
    // unsaved chat must not carry over to this one.
    premiumModelTipStore.clearPendingDismissals()
    // The "" sentinel is a single global slot for a not-yet-created chat's
    // selected skills. Without clearing it here, skills picked on an
    // abandoned placeholder chat would migrate onto the next one (CR-001).
    const userId = userStore.user?.userId
    if (userId) storage.remove(userId, chatSkillsKey(''))
    chatsStore.newChatParams = { assistantId, folder: folderValue, isWorkflow }
    chatsStore.currentChat = newConversation

    return newConversation
  },

  createChat: async () => {
    const params = chatsStore.newChatParams ?? {
      assistantId: '',
      folder: '',
      isWorkflow: false,
    }

    const folderValue = params.folder === DEFAULT_CHAT_FOLDER ? '' : params.folder
    const response = await api.post(`v1/conversations`, {
      initial_assistant_id: params.assistantId,
      folder: folderValue,
      is_workflow: params.isWorkflow,
    })
    const newChat = await response.json()
    const transformedChat = transformChatListItemDTOs([newChat])[0]

    if (chatsStore.chats.length) {
      chatsStore.chats.unshift(transformedChat)
    } else {
      chatsStore.getChats()
    }
    chatsStore.getFolders()
    chatsStore.getAssistantFolders()

    const fullChat = await chatsStore.getChat(newChat.id)

    chatsStore.isNewChat = false
    chatsStore.newChatParams = null

    // The chat the user dismissed the tip on has just acquired a real id;
    // carry the dismissal across so the tip does not pop back on promotion.
    premiumModelTipStore.promotePendingDismissals(newChat.id)

    router.replace({ name: 'chats', params: { id: newChat.id } })

    return fullChat
  },

  pinChat: async (id) => {
    const chat = chatsStore.findChat(id)
    if (!chat) return

    await api.put(`v1/conversations/${id}`, { pinned: !chat.pinned }).then(() => {
      chat.pinned = !chat.pinned
      // Pin/unpin is a menu action, not usage — it must not touch updateDate. The Pinned
      // section's own order comes from pinOrderStore instead.
      if (chat.pinned) pinOrderStore.recordPin(id)
      else pinOrderStore.clearPin(id)
    })
  },

  renameChat: async (id, name) => {
    const chat = chatsStore.findChat(id)
    if (!chat) return

    const trimmedName = name?.trim()
    if (!trimmedName) {
      toaster.error('Chat name cannot be empty')
      return
    }

    await api.put(`v1/conversations/${id}`, { name: trimmedName }).then(() => {
      chat.name = trimmedName
      recentChatsStore.updateRecentChatName(id, trimmedName)
    })
  },

  updateChat: (id, data) => {
    const chat = chatsStore.currentChat as Conversation

    if (chatsStore.isNewChat) {
      if (chat) Object.assign(chat, data)
      return Promise.resolve(null)
    }

    return api
      .put(`v1/conversations/${id}`, mapConversationUpdatePayload(data))
      .then((response) => {
        const chatListItem = chatsStore.chats.find((item) => item.id === id)
        if (chatListItem) Object.assign(chatListItem, data)
        if (chat) Object.assign(chat, data)

        if (data.name) {
          recentChatsStore.updateRecentChatName(id, data.name)
        }

        return response.json()
      })
  },

  updateChatWithAssistantData: (assistant) => {
    const { currentChat } = chatsStore
    if (currentChat?.assistantData) {
      currentChat.assistantData = currentChat.assistantData.map((item: any) =>
        item.id === assistant.id
          ? {
              ...item,
              name: assistant.name,
              conversationStarters: assistant.conversation_starters,
              context: assistant.context?.map((context: any) => context.name),
              tools: assistant.tools?.map((tool: any) => tool.name),
            }
          : item
      )
    }
  },

  deleteChat: (id) => {
    chatsStore.stopChatCompletionPoll(id)
    return api.delete(`v1/conversations/${id}`).then((response) => {
      chatsStore.chats = chatsStore.chats.filter((chat) => chat.id !== id)
      recentChatsStore.removeRecentChat(id)
      workflowExecutionsStore.removeExecutionsByConversationId(id)
      removeChatStorage(userStore.user?.userId, id)
      pinOrderStore.clearPin(id)
      moveOrderStore.clearMove(id)
      return response.json()
    })
  },

  exportChat: (format) => {
    const chat = chatsStore.currentChat
    if (!chat) return null
    const name = sanitizeFileName(chat.name) || 'chat_export'
    return api.downloadFileStream(
      `v1/conversations/${chat.id}/export?export_format=${format}`,
      undefined,
      `${name}.${format}`
    )
  },

  shareChat: async (chatId) => {
    try {
      const response = await api.post('v1/share/conversations', { chat_id: chatId })
      const data = await response.json()
      return `${getRootPath()}/share/conversations/${data.token}`
    } catch (error) {
      toaster.error('Failed to share chat. Please try again later.')
      console.error('Failed to share chat:', error)
      return null
    }
  },

  clearChatHistory: async (chatID) => {
    await api.delete(`v1/conversations/${chatID}/history`).then((response) => response.json())
    workflowExecutionsStore.removeExecutionsByConversationId(chatID)
    const chat = await chatsStore.getChat(chatID)
    chatsStore.updateChatListItem(chat)
  },

  deleteAllConversations: async () => {
    chatPollTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
    chatPollTimeouts.clear()
    const chatIds = chatsStore.chats.map((c) => c.id)
    await api.delete(`v1/conversations`).then((response) => response.json())
    chatIds.forEach((id) => {
      removeChatStorage(userStore.user?.userId, id)
      pinOrderStore.clearPin(id)
      moveOrderStore.clearMove(id)
    })
    chatsStore.chats = []
    chatsStore.chatFolders = []
    chatsStore.assistantFolders = []
    chatsStore.currentChat = null
    chatsStore.openedChatsHistory = []
    workflowExecutionsStore.removeAllChatLinkedExecutions()
    toaster.info('All conversations have been successfully deleted.')
  },

  exportConversationAIMessage: (chatID, historyIndex, messageIndex, format) => {
    return api.downloadFileStream(
      `v1/conversations/${chatID}/history/${historyIndex}/${messageIndex}/export?export_format=${format}`,
      undefined,
      `message_export.${format}`
    )
  },

  updateChatListItem: (newItem) => {
    const existingItemIndex = chatsStore.chats.findIndex((item) => item.id === newItem.id)

    if (existingItemIndex !== -1) {
      const existingItem = chatsStore.chats[existingItemIndex]
      const definedUpdates = Object.fromEntries(
        Object.entries(newItem).filter(([, v]) => v !== undefined)
      )
      chatsStore.chats[existingItemIndex] = { ...existingItem, ...definedUpdates }
    }
  },

  createFolder: (folder) => {
    return api.post('v1/conversations/folder', { folder }).then(() => chatsStore.getFolders())
  },

  getFolders: () => {
    return api
      .get('v1/conversations/folders/list')
      .then((response) => response.json())
      .then((dtos) => {
        const folders = transformFolderListItemsDTOs(dtos)
        chatsStore.chatFolders = folders.reduce((acc: FolderListItem[], current) => {
          if (!acc.find((item) => item.name === current.name)) acc.push(current)
          return acc
        }, [])
        return chatsStore.chatFolders
      })
  },

  getAssistantFolders: () => {
    return api
      .get('v1/assistant-folders')
      .then((response) => response.json())
      .then((folders: AssistantFolderListItem[] | null) => {
        const normalizedFolders = Array.isArray(folders) ? folders : []
        chatsStore.assistantFolders = normalizedFolders
        return normalizedFolders
      })
  },

  deleteAssistantFolder: async (assistantId, action) => {
    const fallbackChats = getAssistantFolderChats(chatsStore.chats, assistantId)
    const fallbackDeletedConversationIds = fallbackChats.map((chat) => chat.id)
    const fallbackResult: AssistantFolderDeleteResponse = {
      deleted_conversation_ids: fallbackDeletedConversationIds,
      folder_deleted: action === 'delete_folder_and_chats',
    }
    const registeredFolder = chatsStore.assistantFolders.find(
      (folder) => folder.assistant_id === assistantId
    )
    let result: AssistantFolderDeleteResponse

    if (registeredFolder) {
      const registeredResult = await deleteRegisteredAssistantFolder(
        assistantId,
        action,
        fallbackResult
      )
      if (!registeredResult) {
        await deleteConversations(fallbackDeletedConversationIds)
      }
      result = registeredResult ?? fallbackResult
    } else {
      await deleteConversations(fallbackDeletedConversationIds)
      result = fallbackResult
      if (action === 'delete_chats_only') {
        chatsStore.assistantFolders.push(getFallbackAssistantFolder(assistantId, fallbackChats))
      }
    }

    result.deleted_conversation_ids.forEach((id) => {
      recentChatsStore.removeRecentChat(id)
      workflowExecutionsStore.removeExecutionsByConversationId(id)
      removeChatStorage(userStore.user?.userId, id)
      pinOrderStore.clearPin(id)
      moveOrderStore.clearMove(id)
    })
    chatsStore.chats = chatsStore.chats.filter(
      (chat) => !result.deleted_conversation_ids.includes(chat.id)
    )
    chatsStore.openedChatsHistory = chatsStore.openedChatsHistory.filter(
      (chat) => !result.deleted_conversation_ids.includes(chat.id)
    )

    if (result.folder_deleted) {
      chatsStore.assistantFolders = chatsStore.assistantFolders.filter(
        (folder) => folder.assistant_id !== assistantId
      )
    }

    return result
  },

  deleteChatFolder: (folder, deleteChats = false) => {
    const folderChatIds = deleteChats
      ? chatsStore.chats.filter((c) => c.folder === folder).map((c) => c.id)
      : []
    return api
      .delete(
        `v1/conversations/folder/${encodeURIComponent(folder)}?remove_conversations=${deleteChats}`
      )
      .then(() => {
        if (deleteChats) {
          recentChatsStore.removeRecentChatsByFolder(folder)
          folderChatIds.forEach((id) => {
            removeChatStorage(userStore.user?.userId, id)
            pinOrderStore.clearPin(id)
            moveOrderStore.clearMove(id)
          })
        }
        return refreshChatsAndFolders()
      })
  },

  renameChatFolder: (oldFolder, newFolder) => {
    return api
      .put(`v1/conversations/folder/${encodeURIComponent(oldFolder)}`, { folder: newFolder })
      .then(() => refreshChatsAndFolders())
  },

  moveChatToFolder: async (chatId, targetFolder, options) => {
    const chat = chatsStore.findChat(chatId)

    if (!chat) return

    const folderValue = targetFolder === DEFAULT_CHAT_FOLDER ? '' : targetFolder
    await api
      .put(`v1/conversations/${chatId}`, { folder: folderValue })
      .then((response) => {
        chat.folder = folderValue
        // A move must land at the top of the target list regardless of the chat's actual
        // last activity, without treating the move itself as activity — moveOrderStore
        // records this independently of updateDate (EPMCDME-15009 reopened AC).
        moveOrderStore.recordMove(chatId)
        return response.json()
      })
      .then(() => {
        const displayName = targetFolder === DEFAULT_CHAT_FOLDER ? 'Chats section' : targetFolder
        if (options?.successMessage) toaster.success(options.successMessage)
        else toaster.info(`Chat moved to ${displayName || 'Chats section'}`)
        return chatsStore.getChats()
      })
      .catch((error) => {
        toaster.error('Failed to move chat')
        console.error('Failed to move chat:', error)
      })
  },

  moveChatsToFolder: async (chatIds, targetFolder) => {
    if (chatIds.length === 0) return

    const folderValue = targetFolder === DEFAULT_CHAT_FOLDER ? '' : targetFolder
    chatsStore.isMovingChatsToFolder = true
    try {
      await api.put('v1/conversations/folders/move', {
        conversation_ids: chatIds,
        target_folder: folderValue,
      })
      chatsStore.chats.forEach((chat) => {
        if (chatIds.includes(chat.id)) chat.folder = folderValue
      })
      chatIds.forEach((id) => moveOrderStore.recordMove(id))
      await refreshChatsAndFolders()
      toaster.success(
        `${chatIds.length} ${chatIds.length === 1 ? 'chat' : 'chats'} moved to ${targetFolder}`
      )
    } catch (error) {
      await refreshChatsAndFolders()
      toaster.error('Failed to move selected chats')
      throw error
    } finally {
      chatsStore.isMovingChatsToFolder = false
    }
  },

  getMetrics: async (chatId) => {
    const response = await api
      .get(`v1/assistants/metrics/${chatId}`)
      .then((response) => response.json())

    chatsStore.metrics = response
    return response
  },

  recognizeSpeech: (audioBlob) => {
    const body = new FormData()
    body.append('file', audioBlob)

    return api
      .postMultipart('v1/speech-recognition', body)
      .then((response) => response.json())
      .catch((_err) => {
        toaster.error('Failed parse provided audio. Please try again.')
      })
  },

  submitFeedback: async (conversationId, feedbackData, historyIndex, messageIndex) => {
    if (!chatsStore.currentChat) return

    const agentMessageIndexBE = getChatBEMessageIndex(
      chatsStore.currentChat,
      historyIndex,
      messageIndex
    )
    const feedback = {
      conversationId,
      messageIndex: agentMessageIndexBE,
      author: 'user',
      mark: feedbackData.mark,
      comments: feedbackData.comments,
      request: feedbackData.request,
      response: feedbackData.response,
      type: feedbackData.type,
      assistant_id: feedbackData.assistant_id,
    }

    await api
      .post('v1/feedback', feedback)
      .then((response) => {
        return response.json()
      })
      .then((responseData) => {
        const chat = chatsStore.currentChat

        if (
          chat?.id === conversationId &&
          chat.history[historyIndex] &&
          chat.history[historyIndex][messageIndex]
        ) {
          chat.history[historyIndex][messageIndex].userMark = {
            feedback_id: responseData.feedback_id || responseData.id,
            mark: feedback.mark,
            comments: feedback.comments,
            type: feedback.type,
          }
        }

        return responseData
      })
  },

  deleteFeedback: async (conversationId, assistantId, feedbackId, historyIndex, messageIndex) => {
    if (!chatsStore.currentChat) return

    const agentMessageIndexBE = getChatBEMessageIndex(
      chatsStore.currentChat,
      historyIndex,
      messageIndex
    )
    const feedback = {
      conversationId,
      feedbackId,
      assistant_id: assistantId,
      messageIndex: agentMessageIndexBE,
      author: 'user',
    }

    await api.delete('v1/feedback', feedback).then(() => {
      const chat = chatsStore.currentChat

      if (chat?.id === conversationId) {
        // Search through all history to find and remove the feedback with matching feedback_id
        chat.history.forEach((historyGroup) => {
          historyGroup.forEach((message) => {
            if (message.userMark && message.userMark.feedback_id === feedbackId) {
              message.userMark = null
            }
          })
        })
      }
    })
  },

  // ===== Recent Chats Methods =====

  getRecentChats(): RecentChat[] {
    return recentChatsStore.getRecentChats()
  },

  addRecentChat(chat: Omit<RecentChat, 'openedAt'>) {
    recentChatsStore.addRecentChat(chat)
  },
})
