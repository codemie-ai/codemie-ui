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

export enum VendorOriginType {
  AWS = 'aws',
}

export enum VendorEntityType {
  assistant = 'assistants',
  workflows = 'workflows',
  knowledgebases = 'knowledgebases',
  guardrails = 'guardrails',
  agentcoreRuntimes = 'agentcore-runtimes',
  agentcoreEndpoints = 'agentcore-runtime-endpoints',
}

export interface VendorAgentCoreRuntime {
  id: string
  name: string
  status: string
  description: string
  version: string
  updatedAt: string
}

export enum AgentCoreEndpointStatus {
  PREPARED = 'PREPARED',
  NOT_PREPARED = 'NOT_PREPARED',
  VERSION_DRIFT = 'VERSION_DRIFT',
  DELETED_ON_AWS = 'DELETED_ON_AWS',
}

export interface VendorAgentCoreEndpoint {
  id: string
  name: string
  status: AgentCoreEndpointStatus
  description: string
  liveVersion?: string
  targetVersion?: string | null
  createdAt?: string
  updatedAt?: string
  aiRunId?: string
  configurationJson?: string
  assistantName?: string
  assistantDescription?: string
}

export interface VendorAgentCoreEndpointDetails extends VendorAgentCoreEndpoint {
  agentRuntimeEndpointArn?: string
  agentRuntimeArn?: string
  failureReason?: string | null
}

export interface AgentCoreEndpointConfigurationJsonReasoning {
  text_path: string
  active_path?: string
  name_path?: string
  args_path?: string
  thoughts_path?: string
}

export interface AgentCoreEndpointConfigurationJsonHistory {
  history_path: string
  role_path?: string
  message_path?: string
  user_role?: string
  assistant_role?: string
}

export interface AgentCoreEndpointConfigurationJson {
  request?: {
    message_path?: string
    history?: AgentCoreEndpointConfigurationJsonHistory
    extra_payload?: Record<string, unknown>
  }
  response: {
    streaming: boolean
    body?: {
      text_path: string
      reasoning?: AgentCoreEndpointConfigurationJsonReasoning
    }
    chunk?: {
      text_path: string
      reasoning?: AgentCoreEndpointConfigurationJsonReasoning
    }
  }
}

export interface VendorEntity {
  id: string
  name: string
  description: string
  status: 'PREPARED' | 'NOT_PREPARED'
  aiRunId?: string
}

export interface VendorKnowledgeBaseEntityDetails {
  id: string
  name: string
  description: string
  type: 'VECTOR' | 'KENDRA' | 'SQL'
  updatedAt: string
  embeddingModel: string
  indexArn?: string
  status: 'PREPARED' | 'NOT_PREPARED'
  aiRunId?: string
  kendraIndexArn: string
}

export interface VendorSetting {
  setting_id: string
  setting_name: string
  project: string
  entities: Array<string>
  invalid?: boolean
  error?: string
}

export interface VendorInstallableVersion {
  versionId: string
  aliasId?: string
  status: 'PREPARED' | 'NOT_PREPARED'
  updatedAt: string
  name: string
  description?: string
  aiRunId?: string
}

export interface VendorVersion {
  id: string
  version: string
  status: 'PREPARED' | 'NOT_PREPARED'
  updatedAt: string
  name: string
  description?: string
  aiRunId?: string
}

export interface VendorAlias {
  id: string
  version: string
  status: 'PREPARED' | 'NOT_PREPARED'
  updatedAt: string
  name: string
  description?: string
  aiRunId?: string
}

export interface VendorAgentVersionDetails {
  id: string
  name: string
  status: 'PREPARED' | 'NOT_PREPARED'
  createdAt: string
  description: string
  foundationModel: string
  instruction: string
  updatedAt: string
  version: string
}

export interface VendorGuardrailVersionDetails {
  id: string
  name: string
  status: 'PREPARED' | 'NOT_PREPARED'
  createdAt: string
  description: string
  updatedAt: string
  version: string
  blockedInputMessaging: string
  blockedOutputsMessaging: string
}
