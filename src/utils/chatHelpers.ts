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

import { ROLE_ASSISTANT, ROLE_USER } from '@/constants'
import type {
  ChatBackend,
  Conversation,
  AssistantDataBackend,
  HistoryItemBackend,
} from '@/types/entity/conversation'

export const transformChatBEtoFE = (chatBE: ChatBackend): Conversation => {
  const transformedChat: Conversation = {
    id: chatBE.id,
    name: chatBE.conversation_name,
    llmModel: chatBE.llm_model,
    isWorkflow: chatBE.is_workflow_conversation ?? chatBE.is_workflow ?? false,
    isGroup: true,
    folder: chatBE.folder,
    assistantIds: chatBE.assistant_ids ?? [],
    initialAssistantId: chatBE.initial_assistant_id,
    assistantData:
      chatBE.assistant_data?.map((data) => ({
        id: data.assistant_id,
        name: data.assistant_name,
        iconUrl: data.assistant_icon,
        conversationStarters: data.conversation_starters,
        context: data.context?.map((context) => context.name),
        tools: data.tools?.map((tool) => tool.name),
      })) ?? [],
    history: [], // We'll populate this shortly
  }

  transformedChat.history = groupAndTransformHistory(chatBE.history, {
    assistantData: chatBE.assistant_data,
  })

  return transformedChat
}

interface WorkflowExecution {
  workflow_id: string
  execution_id: string
}

interface LocalChat {
  assistantID: string
  history: any[][]
}

export const transformWorkflowExecutionHistoryBEtoFE = (
  execution: WorkflowExecution,
  historyBE: HistoryItemBackend[],
  localChats: LocalChat[] = []
): any[][] => {
  let history = groupAndTransformHistory(historyBE, {})

  if (!history.length) {
    const localWFChats = localChats.filter((chat) => chat.assistantID === execution.workflow_id)
    const localExecutionHistory = localWFChats
      .map((localChat) =>
        localChat.history
          .flat()
          .filter((item) => item.workflowExecution?.id === execution.execution_id)
      )
      .flat()

    history = localExecutionHistory.length ? [localExecutionHistory] : []
  }

  return history
}

function groupAndTransformHistory(
  history: HistoryItemBackend[],
  { assistantData = [] }: { assistantData?: AssistantDataBackend[] }
): any[][] {
  const groupedHistory = history.reduce((acc: Record<number, HistoryItemBackend[]>, item) => {
    if (!Number.isInteger(item.historyIndex)) {
      return acc
    }
    acc[item.historyIndex] = acc[item.historyIndex] ?? []
    acc[item.historyIndex].push(item)
    return acc
  }, {})

  return Object.values(groupedHistory).map((group) =>
    transformHistoryGroup(group, { assistantData })
  )
}

function transformHistoryGroup(
  group: HistoryItemBackend[],
  { assistantData }: { assistantData?: AssistantDataBackend[] }
): any[] {
  return Array.from({ length: group.length / 2 }, (_, i) => {
    const userItem = group[2 * i]
    const assistantItem = group[2 * i + 1]
    const assistant =
      assistantData?.find((assistant) => assistant.assistant_id === assistantItem.assistantId) ?? {}
    return {
      request: userItem.message,
      requestRaw: userItem.messageRaw,
      response: assistantItem.message,
      createdAt: userItem.date,
      fileNames: userItem.fileNames,
      thoughts: assistantItem.thoughts
        ? assistantItem.thoughts.map((thought) => ({
            id: thought.id,
            author_name: thought.tool_name ?? thought.author_name,
            author_type: thought.author_type ?? 'Tool',
            message: thought.message,
            input_text: thought.input_text,
            children: thought.children,
            output_format: thought.output_format,
            in_progress: false,
            error: thought.error ?? false,
          }))
        : [],
      assistantId: assistantItem.assistantId,
      assistant: assistant
        ? {
            id: (assistant as any).assistant_id ?? assistantItem.assistantId ?? '',
            name: (assistant as any).assistant_name ?? '',
            iconUrl: (assistant as any).assistant_icon ?? '',
            context: ((assistant as any).context ?? []).map((context: any) => context.name),
            tools: ((assistant as any).tools ?? []).map((tool: any) => tool.name),
          }
        : {},
      processingTime: assistantItem.responseTime, // Add FE response
      userMark: assistantItem.userMark, // Include userMark data from backend
      inProgress: false,
      stream: null,
      executionId: assistantItem.executionId,
    }
  })
}

interface ChatWithHistory {
  history: any[][]
  isGroup?: boolean
}

export const transformChatHistoryFEtoBE = (
  chat: ChatWithHistory,
  historyIndex: number | null
): any[] => {
  const { length } = chat.history
  let historyItems: any[][]

  if (historyIndex === null) {
    historyItems = chat.history.slice(-length)
  } else {
    historyItems = chat.history.slice(-length, historyIndex)
  }

  const messages: any[] = []

  historyItems
    .map((messages) => messages[messages.length - 1])
    .forEach((message) => {
      messages.push({
        role: ROLE_USER,
        message: message.request,
        createdAt: message.createdAt,
      })

      messages.push({
        role: ROLE_ASSISTANT,
        message: message.response,
        createdAt: message.createdAt,
        ...(chat.isGroup
          ? {
              assistantName: message.assistantName,
              assistantId: message.assistantId,
            }
          : {}),
      })
    })

  return messages
}

export const getChatBEMessageIndex = (
  chat: ChatWithHistory,
  historyIndexFE: number,
  messageIndexFE: number,
  role = ROLE_ASSISTANT
): number => {
  // Early return if chat or history is empty
  if (!chat || !chat.history || chat.history.length === 0) return -1

  // Create a flattened copy of the chat history and sort by date
  const sortedFlatHistory = [...chat.history]
    .flat()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  // If historyIndex is out of bounds, return -1
  if (historyIndexFE < 0 || historyIndexFE >= chat.history.length) return -1

  // If messageIndex is out of bounds, return -1
  if (messageIndexFE < 0 || messageIndexFE >= chat.history[historyIndexFE].length) return -1

  // Get the message from FE indexing
  const targetMessage = chat.history[historyIndexFE][messageIndexFE]

  // Find this message in the sorted flat array by comparing essential properties
  // Using date as the primary identifier since it should be unique
  const relativeIndex = sortedFlatHistory.findIndex(
    (msg) => msg.createdAt === targetMessage.createdAt && msg.message === targetMessage.message
  )

  if (role === ROLE_ASSISTANT) {
    return relativeIndex * 2 + 1
  }
  return relativeIndex * 2
}
