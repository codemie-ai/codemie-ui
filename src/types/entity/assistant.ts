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

import { AssistantType, ToolkitType } from '@/constants/assistants'
import type { CreatedBy } from '@/types/common'
import { DynamicFormFieldSchema } from '@/types/dynamicForm'

import { EntityGuardrailAssignment } from './guardrail'

import type { MCPServerDetails } from './mcp'
import type { Setting } from './setting'
import type { Skill } from './skill'

// Agent mode enum
export enum AgentMode {
  GENERAL = 'general',
  PLAN_EXECUTE = 'plan_execute',
}

export interface AssistantCategory {
  id: string
  name: string
  description: string
}

export interface AssistantPromptVariableMeta {
  customRender?: () => void
  userDefined?: boolean
}

export interface AssistantPromptVariable {
  key: string
  description?: string
  default_value?: string
  is_sensitive?: boolean
  _meta?: AssistantPromptVariableMeta
}

export interface Assistant {
  id: string
  name: string
  slug: string
  description: string
  icon_url?: string
  created_by?: CreatedBy
  is_global: boolean
  shared: boolean
  created_at: string
  updated_at: string
  tools?: any[]
  system_prompt: string
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number | null
  tools_tokens_size_limit?: number
  frequency_penalty?: number
  presence_penalty?: number
  type?: AssistantType
  conversation_starters?: string[]
  llm_model_type: string
  is_liked?: boolean
  is_disliked?: boolean
  is_react?: boolean
  unique_likes_count?: number
  unique_dislikes_count?: number
  nested_assistants?: any[]
  nestedAssistants?: Assistant[]
  user_abilities?: string[]
  can_edit?: boolean
  project?: string
  context?: AssistantContext[]
  toolkits?: AssistantToolkit[]
  mcp_servers: MCPServerDetails[]
  agent_card?: AgentCard
  integration_id?: string
  unique_users_count?: string | number
  categories?: AssistantCategory[]
  prompt_variables?: AssistantPromptVariable[]
  smart_tool_selection_enabled?: boolean
  system_prompt_history: {
    date: string
    system_prompt: string
    created_by: {
      id: string
      username: string
      name: string
    }
  }[]

  guardrail_assignments: EntityGuardrailAssignment[]

  // Marketplace publishing validation bypass tracking
  published_with_ignored_recommendations?: boolean

  // Skills
  skills?: Skill[]
}

export interface AgentCardCapabilities {
  streaming?: boolean
  pushNotifications?: boolean
  stateTransitionHistory?: boolean
}

export interface AgentCardProvider {
  organization: string
  url?: string
}

export interface AgentCardSkill {
  id: string
  name: string
  description: string
  examples?: string[]
  tags?: string[]
  inputModes?: string[]
  outputModes?: string[]
}

export interface AgentCard {
  name: string
  description: string
  version?: string
  documentationUrl?: string
  provider?: AgentCardProvider
  capabilities?: AgentCardCapabilities
  defaultInputModes?: string[]
  defaultOutputModes?: string[]
  skills?: AgentCardSkill[]
  url?: string
}

export interface AssistantTemplate {
  id: string
  name: string
  slug: string
  description: string
  icon_url?: string
  system_prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  category?: string
  tags?: string[]
  version?: string
}

export enum AssistantTab {
  AllAssistants = 'all',
  UserAssistants = 'user',
}

export interface AssistantToolkit {
  toolkit: ToolkitType
  tools: Tool[]
  label: string
  settings_config: boolean
  settings?: Setting | null
  is_external: boolean
}

export interface Tool {
  name: string
  label: string
  settings?: Setting | null
  settings_config: boolean
  description?: string | null
  user_description?: string | null
  serverConfig?: MCPServerDetails
  tool: any
}

export interface AssistantContext {
  name: string
  context_type: ContextType
  id: string
}

export enum ContextType {
  KNOWLEDGE_BASE = 'knowledge_base',
  CODE = 'code',
  PROVIDER = 'provider',
}

export interface RecentAssistant {
  icon_url: string
  name: string
  type: AssistantType
  user_abilities: string[]
  id: string
}

export interface AssistantAIGeneratedFields {
  name: string
  description: string
  conversation_starters: string[]
  system_prompt: string
  toolkits: { toolkit: string; tools: { name: string; label: string }[] }[]
  categories: string[]
}

export type AssistantAIFieldMarkers = Record<keyof AssistantAIGeneratedFields | 'context', boolean>

export interface AssistantAIRefineFields {
  name?: string
  description?: string
  conversation_starters?: string[]
  categories?: string[]
  system_prompt?: string
  toolkits?: { toolkit: string; tools: { name: string; label: string }[] }[]
  context?: AssistantContext[]
  llm_model?: string
  include_context?: boolean
  include_tools?: boolean
  project?: string | null
  refine_prompt?: string
}

export enum RecommendationAction {
  CHANGE = 'change',
  DELETE = 'delete',
  KEEP = 'keep',
  ADD = 'add',
}

export enum RecommendationSeverity {
  CRITICAL = 'critical',
  OPTIONAL = 'optional',
}

export interface FieldRecommendation {
  name: string
  action: RecommendationAction
  recommended?: string | string[] | null
  reason?: string | null
  severity: RecommendationSeverity
}

export interface ToolRecommendation {
  name: string
  action: RecommendationAction
  reason?: string | null
  severity: RecommendationSeverity
}

export interface ToolkitRecommendation {
  toolkit: string
  tools: ToolRecommendation[]
}

export interface ContextRecommendation {
  name: string
  action: RecommendationAction
  reason?: string | null
  severity: RecommendationSeverity
}

export interface AssistantAIRefineResponse {
  fields: FieldRecommendation[]
  context: ContextRecommendation[]
  toolkits: ToolkitRecommendation[]
}

export interface InlineCredential {
  toolkit: string | null
  tool: string | null
  mcp_server: string | null
  credential_type: string
  env_vars: string[] | null
  sub_assistant_name?: string
  sub_assistant_id?: string
}

export interface SubAssistantInfo {
  id: string
  name: string
  description: string
  is_global: boolean
  icon_url?: string
  categories?: string[]
}

export interface SubAssistantPublishSettings {
  assistant_id: string
  is_global: boolean
  toolkits?: AssistantToolkit[] | null
  mcp_servers?: MCPServerDetails[] | null
  categories?: string[]
}

export interface QualityValidationRecommendations {
  fields?: FieldRecommendation[]
  toolkits?: ToolkitRecommendation[]
  context?: ContextRecommendation[]
}

export interface QualityValidation {
  decision: 'accept' | 'reject'
  recommendations?: QualityValidationRecommendations
}

export interface PromptVariable {
  key: string
  description?: string
  default_value: string
  is_sensitive: boolean
}

export interface PublishValidationResponse {
  requires_confirmation: boolean
  message: string
  inline_credentials: InlineCredential[]
  assistant_id: string
  sub_assistants?: SubAssistantInfo[]
  quality_validation?: QualityValidation
  prompt_variables?: PromptVariable[]
}

export type MissingToolConfigLevel = 'toolkit' | 'tool'

export interface MissingTool {
  toolkit: string
  tool: string
  label: string
  credential_type: string
  settings_config_level: MissingToolConfigLevel
}

export interface MissingIntegrationByCredentialType {
  credential_type: string
  missing_tools: MissingTool[]
  assistant_id: string | null
  assistant_name: string | null
  icon_url?: string | null
}

export interface AssistantValidationResponse {
  message: string
  assistantId: string | null
  validation?: {
    has_missing_integrations: boolean
    missing_by_credential_type: MissingIntegrationByCredentialType[]
    sub_assistants_missing: MissingIntegrationByCredentialType[]
    message: string
  }
}

export interface AssistantCreateResponse extends AssistantValidationResponse {
  id?: string
  error?: string
}

// Tool details for creating/updating assistants
export interface ToolDetails {
  name: string
  label?: string
  settings_config?: boolean
  settings?: any
  description?: string | null
  user_description?: string | null
}

// Toolkit details for creating/updating assistants
export interface ToolKitDetails {
  toolkit: string
  tools: ToolDetails[]
  label?: string
  settings_config?: boolean
  settings?: any
  is_external?: boolean
}

// DTO for creating an assistant
export interface CreateAssistantDto {
  name: string
  description?: string
  system_prompt?: string
  project?: string
  context?: AssistantContext[]
  icon_url?: string
  llm_model_type?: string
  toolkits?: ToolKitDetails[]
  conversation_starters?: string[]
  shared?: boolean
  is_react?: boolean
  is_global?: boolean
  agent_mode?: AgentMode
  plan_prompt?: string
  slug?: string
  temperature?: number
  top_p?: number
  tools_tokens_size_limit?: number
  mcp_servers?: MCPServerDetails[]
  assistant_ids?: string[]
  type?: AssistantType
  agent_card?: AgentCard
  categories?: AssistantCategory[]
  smart_tool_selection_enabled?: boolean
  prompt_variables?: AssistantPromptVariable[]
  guardrail_assignments: EntityGuardrailAssignment[]
  skip_integration_validation?: boolean
  skill_ids?: string[]
}

// Tool schema types
export interface AssistantToolSchemaResponse {
  tool_name: string
  creds_schema: Record<string, DynamicFormFieldSchema>
  args_schema: Record<string, DynamicFormFieldSchema>
}
