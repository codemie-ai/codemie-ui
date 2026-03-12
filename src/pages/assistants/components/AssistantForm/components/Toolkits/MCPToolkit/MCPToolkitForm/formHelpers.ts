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

import { userSettingsStore } from '@/store/userSettings'
import { MCPServerDetails, MCPServerConfig } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

import { parseConfigJson } from '../validators'

export const buildServerConfig = (values: any, inputMode: 'JSON' | 'Form'): MCPServerDetails => {
  const mcpServer: MCPServerDetails = {
    name: values.name,
    description: values.description,
    mcp_connect_url: values.connectUrl,
  }

  const config: MCPServerConfig = parseConfigJson(values.configJson)

  if (values.tokensSizeLimit !== null && values.tokensSizeLimit !== undefined) {
    mcpServer.tools_tokens_size_limit = values.tokensSizeLimit
  }

  if (inputMode === 'JSON') {
    mcpServer.config = config
  } else {
    mcpServer.command = values.command ?? ''
    mcpServer.arguments = values.arguments ?? ''
  }

  return mcpServer
}

export const createOrUpdateMcpSetting = async (
  settingName: string,
  manualEnvVarValues: Record<string, string>,
  project: string
) => {
  const credential_values = Object.entries(manualEnvVarValues).map(([key, value]) => ({
    key,
    value,
  }))

  const existingSetting = await userSettingsStore.findUserSetting(project, 'MCP', settingName)

  if (existingSetting) {
    await userSettingsStore.updateUserSetting(existingSetting.id, {
      alias: settingName,
      credential_type: 'MCP',
      credential_values,
    })
    toaster.info('MCP setting updated successfully')
  } else {
    await userSettingsStore.createUserSetting({
      alias: settingName,
      credential_type: 'MCP',
      credential_values,
      project_name: project,
    })
    toaster.info('MCP setting created successfully')
  }

  userSettingsStore.resetIsSettingsIndexed()

  return userSettingsStore.findUserSetting(project, 'MCP', settingName)
}

export const handleNewEnvVarMode = async (
  serverConfig: MCPServerDetails,
  manualEnvVarValues: Record<string, string>,
  project: string,
  validateManualEnvVars: () => boolean
) => {
  if (!validateManualEnvVars()) {
    toaster.error('Please fill all required environment variables')
    return null
  }

  const settingName = `${serverConfig.name.replace(/[^a-zA-Z0-9]/g, '_')}_env_vars`

  try {
    const finalSetting = await createOrUpdateMcpSetting(settingName, manualEnvVarValues, project)

    if (!finalSetting?.id) {
      console.error('Failed to find setting after creation/update')
      toaster.error('Failed to find MCP setting')
      return null
    }

    return finalSetting
  } catch (error) {
    console.error('Error creating/updating MCP setting:', error)
    toaster.error('Failed to save MCP setting')
    return null
  }
}
