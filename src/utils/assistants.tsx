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

import { TOOLKIT_KEY } from '@/constants/assistants'
import { MCP_SETTINGS_TYPE_LABEL } from '@/constants/settings'
import { Toolkit } from '@/pages/assistants/components/AssistantDetails/components/UserMapping/types'
import { getCredentialType } from '@/utils/settings'

export const initializeUserMappingSettings = (assistant: any, userMapping: any = null) => {
  const userMappingSettings: Record<string, any> = {}

  if (assistant?.toolkits) {
    assistant.toolkits.forEach((toolkit: any) => {
      const toolkitKey = toolkit.toolkit // Key for toolkit itself

      // Handle toolkit-level user settings
      if (toolkit.settings_config) {
        userMappingSettings[toolkitKey] = getToolkitSetting(toolkitKey, toolkit)
      }

      // Handle tool-level user settings
      if (toolkit.tools) {
        toolkit.tools.forEach((tool: any) => {
          if (tool.settings_config) {
            const toolKey = `${toolkitKey}_${tool.name}`
            userMappingSettings[toolKey] = getToolSetting(toolkitKey, tool)
          }
        })
      }
    })
  }

  if (assistant.mcp_servers) {
    assistant.mcp_servers.forEach((server: any) => {
      if (server.enabled) {
        const serverKey = `${MCP_SETTINGS_TYPE_LABEL}_${server.name}`
        userMappingSettings[serverKey] = {
          credentialType: MCP_SETTINGS_TYPE_LABEL,
          isToolkit: false,
          originalName: `${MCP_SETTINGS_TYPE_LABEL}:${server.name}`, // This is what will be saved in mapping
        }
      }
    })
  }

  // Apply user mapping if it exists
  if (userMapping && userMapping.tools_config) {
    applyUserMapping(userMappingSettings, userMapping.tools_config)
  }

  return userMappingSettings
}

const getToolkitSetting = (toolkitKey: string, toolkit: any) => {
  const credentialType = getCredentialType(toolkitKey)
  return {
    credentialType,
    settingId: toolkit.user_settings?.id || null,
    setting: toolkit.user_settings || null,
    isToolkit: true,
    originalName: toolkitKey,
  }
}

/**
 * Gets tool setting object
 */
const getToolSetting = (toolkitKey: string, tool: any) => {
  const credentialType = getCredentialType(tool.name)
  return {
    credentialType,
    settingId: tool.user_settings?.id || null,
    setting: tool.user_settings || null,
    isToolkit: false,
    toolkitName: toolkitKey,
    originalName: tool.name,
  }
}

const applyUserMapping = (userMappingSettings: Record<string, any>, toolsConfig: any[]) => {
  if (!toolsConfig || !Array.isArray(toolsConfig)) {
    return
  }

  // Process each tool mapping
  toolsConfig.forEach((mapping) => {
    const toolName = mapping.name
    const integrationId = mapping.integration_id

    // Find the matching item in userMappingSettings
    // First, try to find direct match for toolkit
    let matchingKey = findMatchingKey(userMappingSettings, toolName)

    // If not found, try to find as a tool within any toolkit
    if (!matchingKey) {
      Object.keys(userMappingSettings).forEach((key) => {
        const setting = userMappingSettings[key]
        if (!setting.isToolkit && setting.originalName === toolName) {
          matchingKey = key
        }
      })
    }

    // If we found a match, update the setting
    if (matchingKey && integrationId) {
      userMappingSettings[matchingKey].settingId = integrationId
      // The actual setting object will be set when we load the settings options
    }
  })
}

/**
 * Finds a matching key in the user mapping settings
 */
const findMatchingKey = (userMappingSettings: Record<string, any>, toolName: string) => {
  // Find direct match as a toolkit
  return Object.keys(userMappingSettings).find((key) => {
    const setting = userMappingSettings[key]
    return setting.isToolkit && setting.originalName === toolName
  })
}

/**
 * Gets displayable toolkits (those with settings_config or tools with settings_config). Mcp servers always included if enabled.
 */
export const getDisplayableToolkits = (assistant: any): Toolkit[] => {
  let result: Toolkit[] = []

  if (assistant?.toolkits) {
    const toolkits = assistant.toolkits.filter(
      (tk: any) => tk.settings_config || (tk.tools && tk.tools.some((t: any) => t.settings_config))
    ) as Toolkit[]
    result = [...result, ...toolkits]
  }

  if (assistant?.mcp_servers) {
    const enabledMcpServers = assistant.mcp_servers.filter((s: any) => s.enabled)
    if (enabledMcpServers.length > 0) {
      result = [
        ...result,
        {
          toolkit: 'MCP',
          label: 'MCP',
          tools: enabledMcpServers.map((s: any) => ({
            name: s.name,
            label: s.name,
            user_description: s.description,
            settings_config: true,
            additionalInformation: s.settings?.credential_values?.length
              ? () => (
                  <div className="mt-1 pr-1 text-xs flex gap-x-1 flex-wrap items-center">
                    <span className="shrink-0">Required env vars:</span>
                    {s.settings.credential_values.map((v: any) => (
                      <span key={v.key} className="py-0.5 px-1 rounded-lg bg-surface-elevated">
                        {v.key}
                      </span>
                    ))}
                  </div>
                )
              : undefined,
          })),
          settings_config: false,
        },
      ]
    }
  }
  return result
}

/**
 * Determines if an assistant has configurable toolkits or tools.
 */
export const hasConfigurableToolkitsOrTools = (assistant: any) => {
  if (assistant.mcp_servers && assistant.mcp_servers.find((s: any) => s.enabled)) {
    return true
  }

  return assistant?.toolkits?.some(
    (tk: any) => tk.settings_config || tk.tools?.some((t: any) => t.settings_config)
  )
}

export const sortToolkitsByOrder = (toolkits, order, keyField = TOOLKIT_KEY) => {
  return toolkits.sort((a, b) => {
    const valueA = keyField ? a[keyField] : a
    const valueB = keyField ? b[keyField] : b

    const indexA = order.indexOf(valueA)
    const indexB = order.indexOf(valueB)

    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })
}
