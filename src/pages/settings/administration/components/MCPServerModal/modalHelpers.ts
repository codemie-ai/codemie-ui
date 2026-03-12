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

import { MCPConfig, MCPConfigRequest, MCPVariableDefinition } from '@/types/entity/mcp'

import { MCPServerFormData } from '../mcpServerValidation'

export const getDefaultFormValues = (): Required<MCPServerFormData> => ({
  name: '',
  description: '',
  categories: [],
  icon_url: '',
  server_home_url: '',
  source_url: '',
  serverConfig: '',
  required_env_vars: [],
})

export const getFormValuesFromServer = (server: MCPConfig): MCPServerFormData => ({
  name: server.name ?? '',
  description: server.description ?? '',
  categories: server.categories ?? [],
  icon_url: server.logo_url ?? '',
  server_home_url: server.server_home_url ?? '',
  source_url: server.source_url ?? '',
  serverConfig: server.config ? JSON.stringify(server.config, null, 2) : '',
  required_env_vars: server.required_env_vars ?? [],
})

export const transformFormDataToSubmit = (data: MCPServerFormData): Partial<MCPConfigRequest> => {
  const config = JSON.parse(data.serverConfig)

  return {
    name: data.name,
    description: data.description,
    categories:
      data.categories && data.categories.length > 0
        ? data.categories.filter((c): c is string => Boolean(c))
        : undefined,
    logo_url: data.icon_url ?? undefined,
    server_home_url: data.server_home_url,
    source_url: data.source_url,
    config,
    required_env_vars:
      data.required_env_vars && data.required_env_vars.length > 0
        ? (data.required_env_vars.map((v) => ({
            name: v.name,
            description: v.description ?? undefined,
            required: v.required ?? true,
          })) as MCPVariableDefinition[])
        : undefined,
  }
}
