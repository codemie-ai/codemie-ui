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

export enum GuardrailEntity {
  ASSISTANT = 'assistant',
  WORKFLOW = 'workflow',
  KNOWLEDGEBASE = 'knowledgebase',
  PROJECT = 'project',
}

export enum GuardrailSource {
  INPUT = 'input',
  OUTPUT = 'output',
  BOTH = 'both',
}

export enum GuardrailMode {
  ALL = 'all',
  FILTERED = 'filtered',
}

export interface CreatedByUser {
  id: string
  name: string
}

export interface BedrockGuardrailData {
  bedrock_guardrail_id: string
  bedrock_version: string
  bedrock_name: string
  bedrock_status: string
  bedrock_created_at: string
  bedrock_updated_at?: string
  bedrock_aws_settings_id: string
}

export interface Guardrail {
  id: string
  name: string
  project_name: string
  description: string
  created_by?: CreatedByUser
  bedrock?: BedrockGuardrailData
  date: string
}

export interface GuardrailSettings {
  mode: GuardrailMode
  source: GuardrailSource
}

export interface GuardrailSettingsWithAccess extends GuardrailSettings {
  editable: boolean
}

export interface GuardrailAssignmentItem {
  guardrail_id: string
  guardrail_name: string
  mode: GuardrailMode
  source: GuardrailSource
  editable?: boolean
}

export interface EntityAssignmentItem {
  id: string
  name: string
  icon_url?: string | null
  index_type?: string
  settings: GuardrailSettings[]
}

export interface EntityAssignmentItemRequest {
  id: string
  settings: GuardrailSettings[]
}

export interface EntityAssignmentConfig {
  settings?: GuardrailSettings[]
  items?: EntityAssignmentItem[]
}

export interface EntityAssignmentConfigRequest {
  settings?: GuardrailSettings[]
  items?: EntityAssignmentItemRequest[]
}

export interface ProjectAssignmentConfig {
  settings: GuardrailSettings[]
}

export interface GuardrailAssignmentResponse {
  project_name: string
  project?: ProjectAssignmentConfig
  assistants?: EntityAssignmentConfig
  datasources?: EntityAssignmentConfig
  workflows?: EntityAssignmentConfig
}

export interface GuardrailAssignmentRequest {
  project?: ProjectAssignmentConfig
  assistants?: EntityAssignmentConfigRequest
  datasources?: EntityAssignmentConfigRequest
  workflows?: EntityAssignmentConfigRequest
}

export interface GuardrailCreateAssignmentResult {
  success: number
  failed: number
  errors: string[]
}

export interface GuardrailAssignment {
  id: string
  project_name: string
  guardrail_id: string
  entity_type: GuardrailEntity
  entity_id: string
  source: GuardrailSource
  mode: GuardrailMode
  scope?: GuardrailEntity
  created_by?: CreatedByUser
}

export interface GuardrailListItem {
  guardrailId: string
  name: string
  description: string
}

export interface EntityGuardrailAssignment {
  guardrail_id: string
  mode: GuardrailMode
  source: GuardrailSource
  editable: boolean
}
