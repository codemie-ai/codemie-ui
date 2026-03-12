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

import {
  MissingIntegrationByCredentialType,
  MissingToolConfigLevel,
} from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'

// ============================================================================
// Type Definitions
// ============================================================================

export interface AssistantMaps {
  credentialTypeToToolConfig: Map<string, MissingToolConfigLevel>
  toolkitToCredentialType: Map<string, string>
  toolkitToToolConfig: Map<string, Map<string, MissingToolConfigLevel>>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets or initializes a nested map for a given toolkit
 */
function getOrInitToolkitMap(
  maps: AssistantMaps,
  toolkit: string
): Map<string, MissingToolConfigLevel> {
  let toolkitMap = maps.toolkitToToolConfig.get(toolkit)
  if (!toolkitMap) {
    toolkitMap = new Map()
    maps.toolkitToToolConfig.set(toolkit, toolkitMap)
  }
  return toolkitMap
}

/**
 * Processes a single missingGroup and updates the maps accordingly
 */
function processMissingGroup(
  missingGroup: MissingIntegrationByCredentialType,
  maps: AssistantMaps
): void {
  const credentialType = getCredentialType(missingGroup.credential_type)

  missingGroup.missing_tools.forEach((missingTool) => {
    maps.credentialTypeToToolConfig.set(credentialType, missingTool.settings_config_level)
    maps.toolkitToCredentialType.set(missingTool.toolkit, credentialType)

    const toolkitMap = getOrInitToolkitMap(maps, missingTool.toolkit)
    toolkitMap.set(missingTool.tool, missingTool.settings_config_level)
  })
}

/**
 * Builds mapping structures from validation response for a set of missing integrations
 */
export function buildAssistantMaps(
  missingIntegrations: MissingIntegrationByCredentialType[]
): AssistantMaps {
  const maps: AssistantMaps = {
    credentialTypeToToolConfig: new Map(),
    toolkitToCredentialType: new Map(),
    toolkitToToolConfig: new Map(),
  }

  missingIntegrations.forEach((missingGroup) => {
    processMissingGroup(missingGroup, maps)
  })

  return maps
}

/**
 * Applies selected integration settings to toolkits based on validation maps
 */
export function applySettingsToToolkits(
  toolkits: any[],
  maps: AssistantMaps,
  selectedIntegrations: Record<string, Setting | undefined>
): any[] {
  return toolkits.map((toolkit: any) => {
    const toolkitName = toolkit.toolkit || ''
    const credentialType = maps.toolkitToCredentialType.get(toolkitName)

    // Early return if no credential type mapping found
    if (!credentialType) {
      return toolkit
    }

    const selectedSetting = selectedIntegrations[credentialType]
    const settingsLevel = maps.credentialTypeToToolConfig.get(credentialType)

    // Early return if no setting selected or no settings level defined
    if (!selectedSetting || !settingsLevel) {
      return toolkit
    }

    const updatedToolkit = { ...toolkit }

    // Apply at toolkit level
    if (settingsLevel === 'toolkit') {
      updatedToolkit.settings = selectedSetting
    }

    // Apply at tool level
    if (settingsLevel === 'tool') {
      const toolkitSettingsMap = maps.toolkitToToolConfig.get(toolkitName)
      if (toolkitSettingsMap) {
        updatedToolkit.tools = (toolkit.tools || []).map((tool: any) => {
          const toolName = tool.name || tool.label || ''
          const isToolLevelSetting = toolkitSettingsMap.get(toolName) === 'tool'

          return isToolLevelSetting ? { ...tool, settings: selectedSetting } : tool
        })
      }
    }

    return updatedToolkit
  })
}
