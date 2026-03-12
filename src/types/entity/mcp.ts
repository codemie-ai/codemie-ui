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

import type { Setting } from './setting'

export interface MCPVariableDefinition {
  name: string
  description: string
  required: boolean
}

export interface MCPServerConfig {
  command?: string
  url?: string
  args?: string[]
  headers?: Record<string, string>
  env?: Record<string, any>
  type?: string
  auth_token?: string
  single_usage?: boolean
}

export interface MCPUserInfo {
  id: string
  name: string
  email: string
}

export interface MCPConfig {
  id: string
  name: string
  description?: string
  server_home_url?: string
  source_url?: string
  logo_url?: string
  categories: string[]
  config?: MCPServerConfig
  required_env_vars: MCPVariableDefinition[]
  user_id: string
  project: string
  is_public: boolean
  is_system: boolean
  created_by?: MCPUserInfo
  usage_count: number
  is_active: boolean
  date?: string
  update_date?: string
}

export interface MCPConfigRequest {
  name: string
  description?: string
  server_home_url?: string
  source_url?: string
  logo_url?: string
  categories?: string[]
  config: MCPServerConfig
  required_env_vars?: MCPVariableDefinition[]
  is_public?: boolean
  is_active?: boolean
}

export interface MCPFilters {
  page?: number
  per_page?: number
  category?: string
  search?: string
  is_public?: boolean
  active_only?: boolean
}

export enum MCPCategory {
  DEVELOPMENT = 'Development',
  AI = 'AI',
  API = 'API',
  DATABASE = 'Database',
  CLOUD = 'Cloud',
  FILESYSTEM = 'Filesystem',
  GIT = 'Git',
  MEMORY = 'Memory',
  AUTOMATION = 'Automation',
  SEARCH = 'Search',
  OTHER = 'Other',
}

export const MCP_CATEGORY_OPTIONS = Object.values(MCPCategory).map((cat) => ({
  label: cat,
  value: cat,
}))

export interface MCPServerDetails {
  name: string
  description?: string
  enabled?: boolean
  config?: MCPServerConfig
  mcp_connect_url?: string
  tools_tokens_size_limit?: number
  command?: string
  arguments?: string
  settings?: Setting
  mcp_connect_auth_token?: Setting
  required_env_vars?: MCPVariableDefinition[]
  isFromMarketplace?: boolean
  categories?: string[]
  logo_url?: string
  tools?: string[]
}
