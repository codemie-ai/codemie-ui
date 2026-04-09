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

import { DynamicFormFieldSchema } from '@/types/dynamicForm'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'

export interface RetryPolicy {
  initial_interval?: number
  backoff_factor?: number
  max_interval?: number
  max_attempts?: number
}

export interface AssistantTool {
  name: string
  integration_alias?: string
}

export interface AssistantConfiguration {
  id: string
  assistant_id?: string
  temperature?: number
  name?: string
  model?: string
  system_prompt?: string
  limit_tool_output_tokens?: number
  tools?: AssistantTool[]
  datasource_ids?: string[]
  mcp_servers?: MCPServerDetails[]
  exclude_extra_context_tools?: boolean
  skill_ids?: string[]
  prompt_variables?: AssistantPromptVariable[]
}

export interface ToolConfiguration {
  id: string
  tool: string
  tool_args?: Record<string, any>
  integration_alias?: string
  trace?: boolean
  tool_result_json_pointer?: string
  resolve_dynamic_values_in_response?: boolean
  mcp_server?: MCPServerDetails
  input_key?: string
}

export type CustomNodeConfigurationValues = Record<string, string>

export enum CustomNodeType {
  GENERATE_DOCUMENT_TREE = 'generate_documents_tree',
  STATE_PROCESSOR = 'state_processor_node',
  RESULT_FINALIZER = 'result_finalizer_node',
  SUPERVISOR = 'supervisor_node',
  SUMMARIZE_CONVERSATION = 'summarize_conversation_node',
  TRANSFORM = 'transform_node',
}

export interface CustomNodeConfiguration {
  id: string
  custom_node_id?: CustomNodeType
  name?: string
  model?: string
  system_prompt?: string
  config?: CustomNodeConfigurationValues | TransformConfig
}

export interface CustomNodeSchemaResponse {
  custom_node_type: string
  config_schema: Record<string, DynamicFormFieldSchema>
}

export enum TransformMappingType {
  EXTRACT = 'extract',
  CONDITION = 'condition',
  TEMPLATE = 'template',
  CONSTANT = 'constant',
  SCRIPT = 'script',
  ARRAY_MAP = 'array_map',
}

export interface TransformMapping {
  output_field: string
  type: TransformMappingType
  source_path?: string
  default?: any
  condition?: string
  then_value?: any
  else_value?: any
  template?: string
  value?: any
  script?: string
  item_field?: string
  filter_condition?: string
}

export enum TransformInputSource {
  CONTEXT_STORE = 'context_store',
  MESSAGES = 'messages',
  USER_INPUT = 'user_input',
  STATE_SCHEMA = 'state_schema',
  COMBINED = 'combined',
}

export enum TransformErrorStrategy {
  FAIL = 'fail',
  SKIP = 'skip',
  DEFAULT = 'default',
  PARTIAL = 'partial',
}

export interface TransformConfig {
  input_source?: TransformInputSource
  input_key?: string
  on_error?: TransformErrorStrategy
  mappings: TransformMapping[]
  output_schema?: string
  default_output?: string
}

export interface StateSwitchCase {
  condition: string
  state_id: string
}

export interface StateSwitch {
  cases: StateSwitchCase[]
  default: string
}

export interface StateCondition {
  expression: string
  then: string
  otherwise: string
}

export interface NextState {
  state_id?: string
  state_ids?: string[]

  output_key?: string
  include_in_llm_history?: boolean
  override_task?: boolean
  store_in_context?: boolean
  clear_prior_messages?: boolean
  clear_context_store?: boolean | 'keep_current'
  reset_keys_in_context_store?: string[]

  iter_key?: string
  append_to_context?: boolean
  condition?: StateCondition
  switch?: StateSwitch

  // Link to meta states
  meta_next_state_id?: string
  meta_iter_state_id?: string
}

export interface StateMeta {
  id?: string
  type: string
  position?: { x: number; y: number }
  measured?: { width?: number; height?: number }
  selected?: boolean
  data?: any
  is_connected?: boolean // Whether node is reachable from entry state
}

export interface CommonStateConfiguration extends MinimalStateConfiguration {
  task?: string
  finish_iteration?: boolean
  next?: NextState
  output_schema?: string
  retry_policy?: RetryPolicy
  wait_for_user_confirmation?: boolean
  interrupt_before?: boolean
  resolve_dynamic_values_in_prompt?: boolean
  result_as_human_message?: boolean
}

export type EntityConfiguration =
  | StateConfiguration
  | AssistantConfiguration
  | ToolConfiguration
  | StateCondition
  | NextState

export interface MinimalStateConfiguration {
  id: string
  _meta?: StateMeta // UI data
}

export interface ConditionalMeta extends StateMeta {
  data: {
    condition: StateCondition
  }
}

export interface ConditionalStateConfiguration extends MinimalStateConfiguration {
  _meta: ConditionalMeta
  next?: NextState
}

export interface SwitchStateConfiguration extends MinimalStateConfiguration {
  next?: NextState
}

export interface NoteStateConfiguration extends MinimalStateConfiguration {
  note: string
  next?: any
}

export interface ToolStateConfiguration extends CommonStateConfiguration {
  id: string
  tool_id?: string
  tool_args?: Record<string, any>
}

export interface AssistantStateConfiguration extends CommonStateConfiguration {
  assistant_id?: string
}

export interface CustomNodeStateConfiguration extends CommonStateConfiguration {
  custom_node_id?: string
}

export interface TransformStateConfiguration extends CommonStateConfiguration {
  custom_node_id?: string
}

export interface IteratorStateConfiguration extends CommonStateConfiguration {
  _meta: StateMeta
}

export type StateConfiguration =
  | AssistantStateConfiguration
  | ToolStateConfiguration
  | ConditionalStateConfiguration
  | NoteStateConfiguration
  | SwitchStateConfiguration
  | CustomNodeStateConfiguration
  | TransformStateConfiguration
  | IteratorStateConfiguration

export interface WorkflowConfiguration {
  // States
  states: StateConfiguration[]

  // Actors
  assistants?: AssistantConfiguration[]
  tools?: ToolConfiguration[]
  custom_nodes?: CustomNodeConfiguration[]

  // Config
  messages_limit_before_summarization?: number
  tokens_limit_before_summarization?: number
  type?: string
  enable_summarization_node?: boolean
  recursion_limit?: number
  max_concurrency?: number
  verbose?: boolean
  max_iteration_key_output_limit?: number
  retry_policy?: RetryPolicy
}
