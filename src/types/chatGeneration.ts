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

import { Thought } from '@/types/entity/conversation'

export type { Thought }

export interface StreamChunk {
  timeElapsed: number | null
  tokensUsed: number | null
  generatedChunk: string | null
  generated: string | Record<string, any> | null
  thought: Thought | null
  context: any | null
  last: boolean
  debug: Record<string, any> | null
  workflowExecution: any | null
  taskId: string | null
}

export type StreamEventType = 'thought' | 'chunk' | 'complete' | 'error'

export interface StreamEvent {
  type: StreamEventType
  data: StreamChunk
}

export type MessageRole = 'Assistant' | 'User'

export interface HistoryMessage {
  role: MessageRole
  message: string
}

export interface ToolConfig {
  name: string
  toolCreds: Record<string, any> | null
  integrationId: string | null
}

export interface DynamicToolsConfig {
  enableWebSearch: boolean | null
  enableCodeInterpreter: boolean | null
}

export interface ChatRequest {
  conversationId: string
  text: string | null
  contentRaw: string
  file_names: string[]
  llmModel: string | null
  history: HistoryMessage[] | string
  historyIndex: number | null
  mcpServerSingleUsage: boolean
  workflowExecutionId: string | null
  stream: boolean
  topK: number
  systemPrompt: string
  backgroundTask: boolean
  metadata: Record<string, any> | null
  toolsConfig: ToolConfig[]
  outputSchema: Record<string, any> | null
  skill_ids?: string[]
  enable_web_search?: boolean | null
  enable_code_interpreter?: boolean | null
}

export interface ChatRequestInput {
  conversationId: string
  text?: string | null
  contentRaw?: string
  files?: string[]
  llmModel?: string | null
  history?: HistoryMessage[] | string
  historyIndex?: number | null
  mcpServerSingleUsage?: boolean
  workflowExecutionId?: string | null
  stream?: boolean
  topK?: number
  systemPrompt?: string
  backgroundTask?: boolean
  metadata?: Record<string, any> | null
  toolsConfig?: ToolConfig[]
  outputSchema?: Record<string, any> | null
}

export interface ChatGenerationOptions {
  message: string
  messageRaw?: string
  assistantId?: string
  historyIndex?: number | null
  messageIndex?: number | null
  files?: string[]
  isWorkFlow?: boolean
  isRefresh?: boolean
  moveToLast?: boolean
  skillIds?: string[]
  dynamicToolsConfig?: DynamicToolsConfig
}
