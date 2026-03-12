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

/* Serialized Workflow Configuration; Repsesents YAML */

import {
  AssistantConfiguration,
  ToolConfiguration,
  CustomNodeConfiguration,
  RetryPolicy,
  NextState,
  AssistantTool,
  CustomNodeConfigurationValues,
} from '@/types/workflowEditor/configuration'

export interface SerializedState {
  id: string

  // Common
  task?: string
  finish_iteration?: boolean
  next?: NextState
  output_schema?: string
  retry_policy?: RetryPolicy
  wait_for_user_confirmation?: boolean
  interrupt_before?: boolean
  iter_key: string

  // Assistant or tool
  name?: string
  model?: string
  system_prompt?: string

  // Assistant
  assistant_id?: string

  limit_tool_output_tokens?: number
  tools?: AssistantTool[]
  datasource_ids?: string[]
  exclude_extra_context_tools?: boolean

  // Tool
  tool_id: string
  tool_args?: Record<string, any>
  integration_alias?: string
  trace?: boolean

  // Custom
  custom_node_id?: string
  config?: CustomNodeConfigurationValues
}

export interface SerializedMetaState {
  id: string
  type: string
  position?: { x: number; y: number }
  measured?: object
  selected?: boolean
  data?: any
}

export interface SerializedWorkflowConfig {
  states: SerializedState[]
  orphaned_states?: SerializedState[]
  meta_states?: SerializedMetaState[]

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
