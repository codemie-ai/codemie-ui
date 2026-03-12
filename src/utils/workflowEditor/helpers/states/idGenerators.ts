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
 * ID Generation Helpers
 *
 * Utility functions for generating unique IDs for states and actors.
 */

import { NodeType, ActorTypes } from '@/types/workflowEditor/base'
import {
  StateConfiguration,
  WorkflowConfiguration,
  AssistantConfiguration,
  ToolConfiguration,
  CustomNodeConfiguration,
} from '@/types/workflowEditor/configuration'
import { ACTOR_FIELD_MAP } from '@/utils/workflowEditor/constants'

type ActorConfiguration = AssistantConfiguration | ToolConfiguration | CustomNodeConfiguration

/**
 * Generates incremental state ID based on existing nodes
 *
 * @param nodeType - The type of node (e.g., 'assistant', 'tool', 'iterator', 'condition')
 * @param existingStates - Array of existing states to check for ID conflicts
 * @returns A unique ID string with format: nodeType_number
 */
export const generateStateID = (
  nodeType: NodeType,
  existingStates: StateConfiguration[]
): string => {
  const prefixWithUnderscore = `${nodeType}_`
  const existingIDs = existingStates
    .map((state) => state.id)
    .filter((id) => id.startsWith(prefixWithUnderscore))

  if (existingIDs.length === 0) {
    return `${prefixWithUnderscore}1`
  }

  const numbers = existingIDs
    .map((id) => {
      const suffix = id.replace(prefixWithUnderscore, '')
      return Number.parseInt(suffix, 10)
    })
    .filter((num) => !Number.isNaN(num))

  const maxNumber = Math.max(...numbers, 0)
  return `${prefixWithUnderscore}${maxNumber + 1}`
}

/**
 * Generates incremental actor ID based on existing actors
 *
 * @param actorType - The type of actor (ActorTypes.Assistant, ActorTypes.Tool, or ActorTypes.CustomNode)
 * @param config - Current workflow configuration containing existing actors
 * @returns A unique actor ID in the format: actorType_number
 */
export const generateActorID = (actorType: ActorTypes, config: WorkflowConfiguration): string => {
  let existingActors: ActorConfiguration[] = []

  if (actorType === ActorTypes.Assistant) {
    existingActors = config.assistants ?? []
  } else if (actorType === ActorTypes.Tool) {
    existingActors = config.tools ?? []
  } else if (actorType === ActorTypes.CustomNode) {
    existingActors = config.custom_nodes ?? []
  }

  const prefixWithUnderscore = `${actorType}_`
  const existingIDs = existingActors
    .map((actor) => actor.id)
    .filter((id) => id.startsWith(prefixWithUnderscore))

  if (existingIDs.length === 0) {
    return `${prefixWithUnderscore}1`
  }

  const numbers = existingIDs
    .map((id) => {
      const suffix = id.replace(prefixWithUnderscore, '')
      return Number.parseInt(suffix, 10)
    })
    .filter((num) => !Number.isNaN(num))

  const maxNumber = Math.max(...numbers, 0)
  return `${prefixWithUnderscore}${maxNumber + 1}`
}

/**
 * Checks if an actor ID (assistant, tool, or custom node) is only referenced by the current node.
 * Returns true if the actor is used by only one node (the current one).
 * Returns false if the actor is used by multiple nodes or doesn't exist.
 *
 * @param config - The workflow configuration containing all states
 * @param actorType - The type of actor (Assistant, Tool, or CustomNode)
 * @param actorId - The actor ID to check
 * @param currentStateId - The ID of the current state/node
 * @returns True if the actor ID can be reused, false otherwise
 */
export const shouldReuseActorId = (
  config: WorkflowConfiguration,
  actorType: ActorTypes,
  actorId: string | undefined,
  currentStateId: string
): boolean => {
  if (!actorId) {
    return false
  }

  const actorField = ACTOR_FIELD_MAP[actorType]

  const referencingStates =
    config.states?.filter((state) => {
      return (state as any)[actorField] === actorId
    }) ?? []

  return referencingStates.length === 1 && referencingStates[0].id === currentStateId
}
