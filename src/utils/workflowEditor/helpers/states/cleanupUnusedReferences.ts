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

/**
 * Cleanup Unused References Helper
 *
 * Removes unused assistants, tools, and custom_nodes from configuration
 * when they are no longer referenced by any states.
 */

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ACTOR_FIELD_MAP } from '@/utils/workflowEditor/constants'

/**
 * Removes unused assistants, tools, and custom_nodes from configuration
 * - Collects all IDs that are referenced by states
 * - Filters out actors that are no longer used by any state
 *
 * @param config - The workflow configuration to clean up
 * @returns Updated configuration with unused references removed
 */
export const cleanupUnusedReferences = (
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const states = config.states ?? []

  // Collect all referenced IDs from states
  const usedAssistantIds = new Set<string>()
  const usedToolIds = new Set<string>()
  const usedCustomNodeIds = new Set<string>()

  for (const state of states) {
    const assistantId = (state as any)[ACTOR_FIELD_MAP.assistant]
    const toolId = (state as any)[ACTOR_FIELD_MAP.tool]
    const customNodeId = (state as any)[ACTOR_FIELD_MAP.custom_node]

    if (assistantId) usedAssistantIds.add(assistantId)
    if (toolId) usedToolIds.add(toolId)
    if (customNodeId) usedCustomNodeIds.add(customNodeId)
  }

  // Filter out unused actors
  const assistants = config.assistants?.filter((assistant) => usedAssistantIds.has(assistant.id))
  const tools = config.tools?.filter((tool) => usedToolIds.has(tool.id))
  const custom_nodes = config.custom_nodes?.filter((node) => usedCustomNodeIds.has(node.id))

  return {
    ...config,
    assistants,
    tools,
    custom_nodes,
  }
}
