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

import { NodeType } from '../workflowEditor'

import type { Thought } from './conversation'
import type { CreatedBy } from '../common'

export interface WorkflowConfigHistoryItem {
  yaml_config: string
  date: string
  created_by: {
    user_id: string
    username: string
    name: string
  }
}

export interface Workflow {
  id: string
  slug: string
  name: string
  yaml_config?: string
  icon_url?: string
  description?: string
  configuration?: string
  yaml_config_history: WorkflowConfigHistoryItem[]
  update_date: string
  [key: string]: any
}

export interface WorkflowTemplate {
  id: string
  slug: string
  name: string
  yaml_config?: string
  [key: string]: any
}

export type WorkflowExecutionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Succeeded'
  | 'Failed'
  | 'Aborted'
  | 'Interrupted'

export interface WorkflowExecutionTokensUsage {
  input_tokens: number
  output_tokens: number
  money_spent: number
}

export interface WorkflowExecution {
  id: string | null
  date: string | null
  update_date: string | null
  workflow_id: string
  execution_id: string
  conversation_id: string
  overall_status: WorkflowExecutionStatus
  output: string | null
  name: string | null
  prompt: string | null
  file_name: string | null
  file_names: string[] | null
  created_by: CreatedBy | null
  tokens_usage: WorkflowExecutionTokensUsage | null
}

export interface ExtendedWorkflowExecution extends WorkflowExecution {
  index: number
}

export interface WorkflowExecutionState {
  id: string
  date: string | null
  update_date: string | null
  execution_id: string
  name: string
  task: string | null
  status: WorkflowExecutionStatus
  started_at: string | null
  completed_at: string | null
  output: string | null
  error: string | null
  thoughts: Thought[]
  preceding_state_ids: string[] | null
  state_id: string | null
  iteration_number?: number | null
}

export interface ExtendedWorkflowExecutionState extends WorkflowExecutionState {
  type?: NodeType | null
  resolvedId: string
}

export interface GroupedWorkflowExecutionState extends ExtendedWorkflowExecutionState {
  items?: GroupedWorkflowExecutionState[]
}

export interface CreateWorkflowExecutionRequest {
  user_input: string
  file_names?: string[]
}

export interface UpdateWorkflowExecutionOutputRequest {
  output: string
  state_id: string
}

export interface RequestWorkflowExecutionOutputChangeRequest {
  request: string
  original_output: string
}

export interface ExportWorkflowExecutionOptions {
  output_format: string
  combined: boolean | string
}

export interface WorkflowTransition {
  id: string
  execution_id: string
  from_state: string
  to_state: string
  workflow_context: Record<string, unknown>
  date: string
}

export interface WorkflowTransitionsResponse {
  data: WorkflowTransition[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
  }
}

export type WorkflowFieldPath = string

export interface WorkflowBaseIssue {
  id: string
  message: string
  details?: string
  stateId?: string
  path: WorkflowFieldPath
  configLine: number
  error_type?: string
  status?: 'resolved' | 'dirty'
}

export interface WorkflowAssistantToolIssue extends WorkflowBaseIssue {
  meta: {
    toolkitType: 'tools' | 'external-tools'
    toolkitName: string
    toolName?: string
  }
}

export interface WorkflowAssistantMcpIssue extends WorkflowBaseIssue {
  meta: { mcpName: string }
}

export type WorkflowIssue =
  | WorkflowBaseIssue
  | WorkflowAssistantToolIssue
  | WorkflowAssistantMcpIssue

export function isWorkflowAssistantToolIssue(
  issue: WorkflowIssue
): issue is WorkflowAssistantToolIssue {
  return (
    'meta' in issue &&
    issue.meta &&
    'toolkitName' in issue.meta &&
    'toolkitType' in issue.meta &&
    issue.path === 'tools'
  )
}

export function isWorkflowAssistantMcpIssue(
  issue: WorkflowIssue
): issue is WorkflowAssistantMcpIssue {
  return 'meta' in issue && issue.meta && 'mcpName' in issue.meta
}
