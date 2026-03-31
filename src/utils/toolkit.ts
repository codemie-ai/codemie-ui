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

import { AssistantToolkit, RecommendationAction, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'

export const extractToolkitSettings = (
  toolkit: AssistantToolkit | null | undefined,
  tool: Tool | null | undefined
): { alias: string | undefined; id: string | undefined } => {
  if (!toolkit) {
    return { alias: undefined, id: undefined }
  }

  if (tool?.settings_config === true) {
    return {
      alias: tool.settings?.alias,
      id: tool.settings?.id,
    }
  }

  return {
    alias: toolkit.settings?.alias,
    id: toolkit.settings?.id,
  }
}

export type ToolRecommendationInput = {
  toolkitName: string
  name: string
  action: string
}

export const applyToolRecommendationsToToolkits = (
  currentToolkits: AssistantToolkit[],
  tools: ToolRecommendationInput[],
  availableToolkits: AssistantToolkit[]
): AssistantToolkit[] => {
  const updatedToolkits = [...currentToolkits]

  tools
    .filter((t) => t.action === RecommendationAction.DELETE)
    .forEach((tool) => {
      const tkIdx = updatedToolkits.findIndex((tk) => tk.toolkit === tool.toolkitName)
      if (tkIdx >= 0) {
        const updatedTools = updatedToolkits[tkIdx].tools?.filter((t) => t.name !== tool.name) ?? []
        if (updatedTools.length === 0) {
          updatedToolkits.splice(tkIdx, 1)
        } else {
          updatedToolkits[tkIdx] = { ...updatedToolkits[tkIdx], tools: updatedTools }
        }
      }
    })

  tools
    .filter(
      (t) => t.action === RecommendationAction.ADD || t.action === RecommendationAction.CHANGE
    )
    .forEach((tool) => {
      const availableTk = availableToolkits.find((tk) => tk.toolkit === tool.toolkitName)
      if (!availableTk) return

      const toolToAdd = availableTk.tools?.find((t) => t.name === tool.name)
      if (!toolToAdd) return

      const tkIdx = updatedToolkits.findIndex((tk) => tk.toolkit === tool.toolkitName)
      if (tkIdx >= 0) {
        const toolExists = updatedToolkits[tkIdx].tools?.some((t) => t.name === tool.name)
        if (!toolExists) {
          updatedToolkits[tkIdx] = {
            ...updatedToolkits[tkIdx],
            tools: [...(updatedToolkits[tkIdx].tools ?? []), toolToAdd],
          }
        }
      } else {
        updatedToolkits.push({
          toolkit: tool.toolkitName,
          label: availableTk.label,
          tools: [toolToAdd],
          settings_config: availableTk.settings_config,
          is_external: availableTk.is_external,
        } as AssistantToolkit)
      }
    })

  return updatedToolkits
}

export const applyToolkitSettings = (
  toolkit: AssistantToolkit,
  tool: Tool | null | undefined,
  setting: Setting | null | undefined
): { toolkit: AssistantToolkit; tool: Tool | null | undefined } => {
  if (!setting) {
    return { toolkit, tool }
  }

  const toolkitCopy = { ...toolkit }
  const toolCopy = tool ? { ...tool } : null

  if (toolCopy?.settings_config === true) {
    toolCopy.settings = setting
    return { toolkit: toolkitCopy, tool: toolCopy }
  }

  toolkitCopy.settings = setting
  return { toolkit: toolkitCopy, tool: toolCopy }
}
