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

import { SCHEDULE_PRESETS, SharePointAuthType } from '@/constants/dataSources'
import { PROVIDER_FIELD_TYPES } from '@/pages/dataSources/constants'
import type { CreatedBy, PaginatedResponse } from '@/types/common'

import { EntityGuardrailAssignment } from './guardrail'

export type OAuthStatus = 'idle' | 'waiting' | 'success' | 'error'

export interface SharePointOAuthInitiateResponse {
  user_code: string
  verification_uri: string
  device_code: string
  interval?: number
  message?: string
}

export interface SharePointOAuthPollResponse {
  status: 'success' | 'error' | 'pending'
  access_token?: string
  username?: string
  message?: string
  slow_down?: boolean
}

export interface DeviceCodeState {
  userCode: string
  verificationUri: string
  deviceCode: string
  interval: number
  message: string
}

// Schedule types
export type SchedulePreset = (typeof SCHEDULE_PRESETS)[keyof typeof SCHEDULE_PRESETS]

export interface SchedulePresetOption {
  value: SchedulePreset
  label: string
}

export interface CronExample {
  expression: string
  description: string
}

export interface DataSource {
  id: string
  project_name: string
  repo_name: string
  index_type: string
  created_by: CreatedBy
  project_space_visible: boolean
  link: string | null
  date: string
  update_date: string
  text: string
  full_name: string
  current_state: number
  complete_state: number
  current__chunks_state: number
  error: boolean
  completed: boolean
  is_fetching: boolean
  is_queued: boolean
  user_abilities: Array<string>
  jira: {
    jql: string
  }
  xray: {
    jql: string
  }
  aice_datasource_id?: string
  azure_devops_wiki?: {
    wiki_query?: string
    wiki_name?: string
  }
  azure_devops_work_item?: {
    wiql_query?: string
  }
  sharepoint?: {
    site_url: string
    include_pages?: boolean
    include_documents?: boolean
    include_lists?: boolean
    files_filter?: string
    auth_type?: SharePointAuthType
    oauth_client_id?: string
    oauth_tenant_id?: string
  }
  cron_expression?: string | null
}

export interface DataSourceDetailsResponse {
  id: string
  name: string
  date: string
  update_date: string
  project_name: string
  description: string
  repo_name: string
  index_type: string
  prompt: any
  embeddings_model: string
  summarization_model: string
  current_state: number
  complete_state: number
  current__chunks_state: number
  processed_files: Array<any>
  error: boolean
  completed: boolean
  text: string
  full_name: string
  created_by: CreatedBy
  project_space_visible: boolean
  docs_generation: boolean
  branch: string
  link: string
  files_filter: string
  google_doc_link: string
  user_abilities: Array<string>
  confluence: any
  jira: any
  xray: any
  azure_devops_wiki: any
  azure_devops_work_item: any
  sharepoint?: {
    site_url: string
    include_pages?: boolean
    include_documents?: boolean
    include_lists?: boolean
    files_filter?: string
    auth_type?: SharePointAuthType
    oauth_client_id?: string
    oauth_tenant_id?: string
  }
  is_fetching: boolean
  is_queued: boolean
  setting_id: string
  tokens_usage: {
    input_tokens: number
    output_tokens: number
    money_spent: number
  }
  processing_info: { unique_extensions: Array<string> } & Record<string, unknown>
  provider_fields: any
  guardrail_assignments: EntityGuardrailAssignment[]
  cron_expression?: string | null
}

export type DatasetResponse = PaginatedResponse<DataSource>

export interface DataProviderField {
  name: string
  description: string
  required: boolean
  parameter_type: (typeof PROVIDER_FIELD_TYPES)[keyof typeof PROVIDER_FIELD_TYPES]
  enum: string[] | null
  multiselect_options: { label: string; value: string }[]
  title?: string | null
  example?: string | null
}

export interface DataProviderSchema {
  description: string
  parameters: DataProviderField[]
}

export interface DataProvider {
  id: string
  provider_name: string
  name: string
  base_schema: DataProviderSchema
  create_schema: DataProviderSchema
}
