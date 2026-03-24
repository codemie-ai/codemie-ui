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

/**
 * Chat entity types from backend API
 */
import type { UserAbility } from '@/types//common'

export const messageFeedbackMark = {
  correct: 'correct',
  wrong: 'wrong',
  empty: '',
} as const

export type MessageFeedbackMark = (typeof messageFeedbackMark)[keyof typeof messageFeedbackMark]

export enum MessageRole {
  User = 'User',
  Assistant = 'Assistant',
}

export enum MessageAuthor {
  User = 'user',
  Operator = 'operator',
}

export enum ThoughtAuthorType {
  Tool = 'Tool',
  Assistant = 'Agent',
}

export enum WorkflowOutputFormat {
  Markdown = 'markdown',
  Text = 'text',
  JSON = 'json',
}

export enum FeedbackType {
  MissedContext = 'Missed or Misunderstood Context',
  FactualInaccuracy = 'Factual Inaccuracy (Hallucination)',
  IncompleteAnswer = 'Incomplete or Partial Answer',
  ContextLimitations = 'Context and Memory Limitations',
  ConfigurationIssues = 'Configuration/Connection Issues',
  Other = 'Other',
}

export interface ChatAssistant {
  id: string
  name: string
  iconUrl?: string
  context?: string[]
  tools?: string[]
  conversationStarters?: string[]
}

export interface ChatListItem {
  id: string
  name: string | null
  folder: string
  pinned: boolean
  date: string
  assistantIds: string[]
  initialAssistantId: string | null
  isGroup: boolean
  isWorkflow: boolean
}

export interface FolderListItem {
  id: string
  date: string
  updateDate: string
  name: string
  userId: string
  userAbilities: UserAbility[]
}

export interface Thought {
  id: string
  author_name?: string
  tool_name?: string
  author_type?: ThoughtAuthorType | string
  message: string
  input_text?: string
  children?: Thought[]
  output_format?: WorkflowOutputFormat | string
  in_progress: boolean
  error?: boolean | string
  parent_id?: string
  content?: string
}

export interface UserMark {
  feedback_id: string | number
  mark: MessageFeedbackMark
  comments?: string
  type?: FeedbackType | string
}

// Note: WorkflowExecution is defined in workflow.ts to avoid duplication
// This is a simplified reference type used in chat messages
export interface ChatWorkflowExecution {
  id: string
  workflow_id?: string
  execution_id?: string
  name?: string
  status?: string
}

/**
 * Streaming data handler
 */
export interface Stream {
  notification?: string | null
  isStreaming: boolean
  start(): void
  finish(): void
  push(chunk: string): void
  getStream(): string
}

export interface ChatMessage {
  role: 'User' | 'Assistant'
  request?: string
  requestRaw?: string
  response?: string
  message?: string
  createdAt: string
  assistantId?: string
  assistant: ChatAssistant
  inProgress?: boolean
  processingTime?: number
  thoughts?: Thought[]
  fileNames?: string[]
  userMark?: UserMark | null
  debug?: any
  loginUrl?: string
  workflowExecution?: ChatWorkflowExecution
  historyIndex?: number
  messageIndex?: number
  stream?: Stream | null
  executionId: string | null
}

export type ChatHistoryGroup = ChatMessage[]

export interface AssistantData {
  id: string
  name: string
  iconUrl?: string
  conversationStarters?: string[]
  context?: string[]
  tools?: string[]
}

export interface Conversation {
  id: string
  name?: string
  llmModel?: string | null
  folder?: string
  pinned?: boolean
  isWorkflow?: boolean
  isGroup?: boolean
  assistantIds: string[]
  initialAssistantId?: string
  initial_assistant_id?: string
  assistantData: AssistantData[]
  history: ChatHistoryGroup[]
  assistantID?: string
  assistantName?: string
}

export interface ChatFolder {
  folder_name: string
  count?: number
}

export interface FeedbackSubmission {
  conversationId: string
  messageIndex: number
  author: MessageAuthor
  mark: MessageFeedbackMark
  comments?: string
  request?: string
  response?: string
  type?: FeedbackType | string
  assistant_id?: string
}

export interface FeedbackDeletion {
  conversationId: string
  feedbackId: string | number
  assistant_id?: string
  messageIndex: number
  author: MessageAuthor
}

export interface ChatMetrics {
  total_input_tokens: number
  total_output_tokens: number
  total_money_spent: number
}

export interface ChatShareResult {
  token: string
  url?: string
  expires_at?: string
}

// Backend entity formats (as received from API)
export interface AssistantDataBackend {
  assistant_id: string
  assistant_name: string
  assistant_icon: string
  conversation_starters?: string[]
  context?: { name: string }[]
  tools?: { name: string }[]
  assistant_type?: string
}

export interface ThoughtBackend {
  id: string
  tool_name?: string
  author_name?: string
  author_type?: string
  message: string
  input_text?: string
  children?: any[]
  output_format?: string
  error?: boolean
}

export interface HistoryItemBackend {
  historyIndex: number
  message: string
  messageRaw?: string
  date: string
  fileNames?: string[]
  assistantId?: string
  thoughts?: ThoughtBackend[]
  responseTime?: number
  userMark?: any
  executionId: string | null
}

export interface ChatBackend {
  id: string
  conversation_name: string
  llm_model?: string
  folder?: string
  pinned?: boolean
  assistant_ids?: string[]
  initial_assistant_id?: string
  assistant_data?: AssistantDataBackend[]
  role?: string
  history: HistoryItemBackend[]
  is_workflow?: boolean
  is_workflow_conversation?: boolean
}

export interface StreamChunk {
  generated_chunk?: string
  thought?: Partial<Thought>
  last?: boolean
  generated?: string
  debug?: any
}

export interface StreamChunkParseResult {
  chunkObjects: StreamChunk[]
  incompleteChunk: string | null
}
