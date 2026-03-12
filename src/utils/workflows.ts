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

import { TOOLKITS } from '@/constants/assistants'
import { WORKFLOW_VISUAL_EDITOR_FLAG } from '@/constants/workflows'
import { MCPServerDetails } from '@/types/entity'
import { AssistantToolkit } from '@/types/entity/assistant'
import { ConfigItem } from '@/types/entity/configuration'
import { Setting } from '@/types/entity/setting'
import { AssistantTool } from '@/types/workflowEditor'
import { isConfigItemEnabled } from '@/utils/settings'

import { applyToolkitSettings } from './toolkit'

export const getToolkitsFromConfiguration = (
  tools: AssistantTool[],
  availableToolkits: AssistantToolkit[],
  settings: Record<string, Setting[]>
): AssistantToolkit[] => {
  const toolsByToolkit = new Map<string, { toolName: string; integrationAlias?: string }[]>()

  // Find which toolkit each tool belongs to by searching through available toolkits
  tools.forEach((configTool) => {
    let foundInToolkit = false

    // Search through all available toolkits to find which one contains this tool
    for (const availableToolkit of availableToolkits) {
      const foundTool = availableToolkit.tools.find((t) => t.name === configTool.name)

      if (foundTool) {
        // Group tools by their toolkit
        if (!toolsByToolkit.has(availableToolkit.toolkit)) {
          toolsByToolkit.set(availableToolkit.toolkit, [])
        }
        toolsByToolkit.get(availableToolkit.toolkit)?.push({
          toolName: configTool.name,
          integrationAlias: configTool.integration_alias,
        })
        foundInToolkit = true
        break // Found the toolkit, no need to search further
      }
    }

    // If tool not found in any toolkit, assign it to 'Plugin' toolkit
    if (!foundInToolkit) {
      if (!toolsByToolkit.has(TOOLKITS.Plugin)) {
        toolsByToolkit.set(TOOLKITS.Plugin, [])
      }
      toolsByToolkit.get(TOOLKITS.Plugin)?.push({
        toolName: configTool.name,
        integrationAlias: configTool.integration_alias,
      })
    }
  })

  // Build AssistantToolkit objects from available toolkits
  const selectedToolkits: AssistantToolkit[] = []

  toolsByToolkit.forEach((toolsData, toolkitName) => {
    const availableToolkit = availableToolkits.find((tk) => tk.toolkit === toolkitName)

    if (toolkitName === TOOLKITS.Plugin) {
      // Handle Plugin toolkit for tools not found in available toolkits
      const pluginTools = toolsData.map((toolData) => {
        const tool: any = {
          name: toolData.toolName,
          description: '',
        }

        // If tool has an integration_alias, find the corresponding setting
        if (toolData.integrationAlias) {
          const allSettings = Object.values(settings).flat()
          const matchingSetting = allSettings.find(
            (setting) => setting.alias === toolData.integrationAlias
          )

          if (matchingSetting) {
            tool.settings = matchingSetting
          }
        }

        return tool
      })

      selectedToolkits.push({
        toolkit: TOOLKITS.Plugin,
        tools: pluginTools,
        label: '',
        settings_config: false,
        is_external: false,
      })
    } else if (availableToolkit) {
      const selectedTools = availableToolkit.tools
        .filter((tool) => toolsData.some((td) => td.toolName === tool.name))
        .map((tool) => {
          const toolData = toolsData.find((td) => td.toolName === tool.name)
          const toolCopy = { ...tool }

          // If tool has an integration_alias, find the corresponding setting
          if (toolData?.integrationAlias) {
            const allSettings = Object.values(settings).flat()
            const matchingSetting = allSettings.find(
              (setting) => setting.alias === toolData.integrationAlias
            )

            if (matchingSetting) {
              toolCopy.settings = matchingSetting
            }
          }

          return toolCopy
        })

      if (selectedTools.length > 0) {
        selectedToolkits.push({
          ...availableToolkit,
          tools: selectedTools,
        })
      }
    }
  })

  return selectedToolkits
}

export const getMCPServersFromConfiguration = (
  mcpServerConfigs: { name: string; integration_alias?: string }[],
  settings: Record<string, Setting[]>
): MCPServerDetails[] => {
  return mcpServerConfigs.map((config) => {
    const mcpServer: MCPServerDetails = {
      ...config,
    }

    // If server has an integration_alias, find the corresponding setting
    if (config.integration_alias) {
      const allSettings = Object.values(settings).flat()
      const matchingSetting = allSettings.find(
        (setting) => setting.alias === config.integration_alias
      )

      if (matchingSetting) {
        mcpServer.settings = matchingSetting
      }
    }

    return mcpServer
  })
}

export const isVisualEditorEnabled = (configs: ConfigItem[]): boolean => {
  return (
    isConfigItemEnabled(configs, WORKFLOW_VISUAL_EDITOR_FLAG) ||
    import.meta.env.VITE_WORKFLOW_VISUAL_EDITOR_ENABLED === 'true'
  )
}

export const normalizeToolkitSettingsForToolForm = (
  toolkits: AssistantToolkit[]
): AssistantToolkit[] => {
  return toolkits.map((toolkit) => {
    const toolkitCopy = { ...toolkit }

    const normalizedTools = toolkit.tools.map((tool) => {
      if (!tool.settings) {
        return tool
      }

      const { toolkit: updatedToolkit, tool: updatedTool } = applyToolkitSettings(
        toolkitCopy,
        tool,
        tool.settings
      )

      if (updatedToolkit.settings) {
        toolkitCopy.settings = updatedToolkit.settings
      }

      if (!updatedTool) {
        return tool
      }

      if (updatedTool.settings_config !== true) {
        return { ...updatedTool, settings: null }
      }

      return updatedTool
    })

    return {
      ...toolkitCopy,
      tools: normalizedTools,
    }
  })
}
