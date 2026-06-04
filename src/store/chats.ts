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

import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { router } from '@/hooks/useVueRouter'
import { SearchResultItem, ChatExportFormat, RecentChat } from '@/types/chats'
import {
  Conversation,
  ChatFolder,
  ChatListItem,
  ChatMetrics,
  FeedbackSubmission,
  FolderListItem,
} from '@/types/entity'
import api from '@/utils/api'
import { transformChatBEtoFE } from '@/utils/chatHelpers'
import storage from '@/utils/storage'
import toaster from '@/utils/toaster'
import { getRootPath } from '@/utils/utils'

import { recentChatsStore } from './recentChats'
import { userStore } from './user'
import {
  getChatBEMessageIndex,
  transformChatListItemDTOs,
  transformFolderListItemsDTOs,
} from './utils/chats'

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
      default:
        payload[key] = value
    }
  })

  return payload
}

const LAST_CHAT_ID = 'last-chat-id'

interface NewChatParams {
  assistantId: string
  folder: string
  isWorkflow: boolean
}

export interface ChatsStoreType {
  // State
  metrics: ChatMetrics | null
  isChatsLoading: boolean
  chats: ChatListItem[]
  chatFolders: FolderListItem[]
  currentChat: Conversation | null
  openedChatsHistory: Conversation[]
  abortControllers: Record<string, AbortController>
  isInitialDataFetched: boolean
  isNewChat: boolean
  newChatParams: NewChatParams | null

  // Chat management methods
  getLastChat(): string | null
  getChats(): Promise<ChatListItem[]>
  findChat(id: string): ChatListItem | undefined
  getChat(id: string, options?: { saveAsRecent?: boolean }): Promise<Conversation>
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

  // Folder management methods
  createFolder(folder: string): Promise<any>
  getFolders(): Promise<ChatFolder[]>
  deleteChatFolder(folder: string, deleteChats?: boolean, localUpdate?: boolean): Promise<void>
  renameChatFolder(oldFolder: string, newFolder: string): Promise<void>
  moveChatToFolder(chatId: string, targetFolder: string): Promise<void>

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
  currentChat: null,
  openedChatsHistory: [],
  metrics: null,
  isChatsLoading: false,
  isInitialDataFetched: false,
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

    return chatsStore.setOpenChat(chat)
  },

  /**
   * Updates execution IDs of conversation messages once response streaming finishes.
   * This allows newly generated messages to display links to their workflow execution page.
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
        if (conversation && conversation[messageIndex]) {
          conversation[messageIndex].executionId = message.executionId
          if (message.thoughts?.length) {
            conversation[messageIndex].thoughts = message.thoughts
          }
        }
      })
    })
  },

  getSharedChat: async (token) => {
    const response = await api.get(`v1/share/conversations/${token}`)
    const chat = (await response.json()).conversation
    const chatFE = transformChatBEtoFE(chat)
    return chatsStore.setOpenChat(chatFE, false)
  },

  setOpenChat: (newChat, saveToOpenedChatsHistory = true) => {
    const existingChat = chatsStore.openedChatsHistory.find((chat) => chat.id === newChat.id)
    const hasMessagesInProgress =
      existingChat?.history.reduce(
        (acc: boolean, messages: any[]) => acc || messages.some((message) => message.inProgress),
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

    const fullChat = await chatsStore.getChat(newChat.id)

    chatsStore.isNewChat = false
    chatsStore.newChatParams = null

    router.replace({ name: 'chats', params: { id: newChat.id } })

    return fullChat
  },

  pinChat: async (id) => {
    const chat = chatsStore.findChat(id)
    if (!chat) return

    await api.put(`v1/conversations/${id}`, { pinned: !chat.pinned }).then(() => {
      chat.pinned = !chat.pinned
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
    return api.delete(`v1/conversations/${id}`).then((response) => {
      chatsStore.chats = chatsStore.chats.filter((chat) => chat.id !== id)
      recentChatsStore.removeRecentChat(id)
      return response.json()
    })
  },

  exportChat: (format) => {
    const chat = chatsStore.currentChat
    if (!chat) return null
    return api.downloadFileStream(`v1/conversations/${chat.id}/export?export_format=${format}`)
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
    const chat = await chatsStore.getChat(chatID)
    chatsStore.updateChatListItem(chat)
  },

  deleteAllConversations: async () => {
    await api.delete(`v1/conversations`).then((response) => response.json())
    chatsStore.chats = []
    chatsStore.chatFolders = []
    chatsStore.currentChat = null
    chatsStore.openedChatsHistory = []
    toaster.info('All conversations have been successfully deleted.')
  },

  exportConversationAIMessage: (chatID, historyIndex, messageIndex, format) => {
    return api.downloadFileStream(
      `v1/conversations/${chatID}/history/${historyIndex}/${messageIndex}/export?export_format=${format}`
    )
  },

  updateChatListItem: (newItem) => {
    const existingItemIndex = chatsStore.chats.findIndex((item) => item.id === newItem.id)

    if (existingItemIndex !== -1) {
      const existingItem = chatsStore[existingItemIndex]
      chatsStore[existingItemIndex] = { ...existingItem, ...newItem }
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

  deleteChatFolder: (folder, deleteChats = false) => {
    return api
      .delete(
        `v1/conversations/folder/${encodeURIComponent(folder)}?remove_conversations=${deleteChats}`
      )
      .then(() => {
        if (deleteChats) {
          recentChatsStore.removeRecentChatsByFolder(folder)
        }
        return chatsStore.getFolders()
      })
      .then(() => chatsStore.getChats())
  },

  renameChatFolder: (oldFolder, newFolder) => {
    return api
      .put(`v1/conversations/folder/${encodeURIComponent(oldFolder)}`, { folder: newFolder })
      .then(() => chatsStore.getFolders())
      .then(() => chatsStore.getChats())
  },

  moveChatToFolder: async (chatId, targetFolder) => {
    const chat = chatsStore.findChat(chatId)

    if (!chat) return

    const folderValue = targetFolder === DEFAULT_CHAT_FOLDER ? '' : targetFolder
    await api
      .put(`v1/conversations/${chatId}`, { folder: folderValue })
      .then((response) => {
        chat.folder = folderValue
        return response.json()
      })
      .then(() => {
        const displayName = targetFolder === DEFAULT_CHAT_FOLDER ? 'Chats section' : targetFolder
        toaster.info(`Chat moved to ${displayName || 'Chats section'}`)
        return chatsStore.getChats()
      })
      .catch((error) => {
        toaster.error('Failed to move chat')
        console.error('Failed to move chat:', error)
      })
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
