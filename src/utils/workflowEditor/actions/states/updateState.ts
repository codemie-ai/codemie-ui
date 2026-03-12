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
 * State configuration updates with immutable reference handling.
 * Pure functions - no mutations.
 */

import {
  WorkflowConfiguration,
  StateConfiguration,
  AssistantStateConfiguration,
  AssistantConfiguration,
  ToolConfiguration,
  CustomNodeConfiguration,
  StateMeta,
  ToolStateConfiguration,
  CustomNodeStateConfiguration,
} from '@/types/workflowEditor/configuration'
import {
  isIterator,
  isDecisionState,
  isNoteState,
  updateStateNext,
  findDirectParents,
} from '@/utils/workflowEditor/helpers/states'

import type { ActionResult } from '../index'

/**
 * Configuration update payload for updating state, assistants etc.
 */
export interface ConfigurationUpdate {
  state?: {
    id: string
    data: Partial<StateConfiguration>
  }
  actors?: {
    assistants?: AssistantConfiguration[]
    customNodes?: CustomNodeConfiguration[]
    tools?: ToolConfiguration[]
  }
}

/** Updates all state ID references in next/condition/switch and meta_next_state_id */
const updateStateIDReferences = (
  states: StateConfiguration[],
  oldId: string,
  newId: string
): StateConfiguration[] => {
  return states.map((state) => {
    if (!state.next && !state._meta?.data?.next) return state

    let updatedState = updateStateNext(state, oldId, newId)

    // Update meta_next_state_id reference
    if (updatedState.next?.meta_next_state_id === oldId) {
      updatedState = {
        ...updatedState,
        next: {
          ...updatedState.next,
          meta_next_state_id: newId,
        },
      }
    }

    return updatedState
  })
}

/** Propagates iterator's iter_key to parent states when iterator node is updated */
const propagateIteratorKeyToParent = (
  states: StateConfiguration[],
  iteratorID: string,
  newIterKey: string | undefined
): StateConfiguration[] => {
  const childIDs = states
    .filter((state) => state.next?.meta_iter_state_id === iteratorID)
    .map((state) => state.id)

  if (childIDs.length === 0) return states

  const parentIDs = new Set(childIDs.flatMap((childID) => findDirectParents(childID, states)))

  return states.map((state) => {
    if (parentIDs.has(state.id)) {
      return {
        ...state,
        next: {
          ...state.next,
          iter_key: newIterKey,
        },
      }
    }
    return state
  })
}

/** Removes orphaned assistants that are no longer referenced by any state */
const cleanupOrphanedAssistants = (config: WorkflowConfiguration): WorkflowConfiguration => {
  if (!config.assistants || config.assistants.length === 0) return config

  const referencedAssistantIds = new Set<string>()
  for (const state of (config.states as AssistantStateConfiguration[]) || []) {
    if (state.assistant_id) referencedAssistantIds.add(state.assistant_id)
  }

  const cleanedAssistants = config.assistants.filter((assistant) =>
    referencedAssistantIds.has(assistant.id)
  )

  return { ...config, assistants: cleanedAssistants }
}

/** Removes orphaned tools that are no longer referenced by any state */
const cleanupOrphanedTools = (config: WorkflowConfiguration): WorkflowConfiguration => {
  if (!config.tools || config.tools.length === 0) return config

  const referencedToolIds = new Set<string>()
  for (const state of (config.states as ToolStateConfiguration[]) || []) {
    if (state.tool_id) referencedToolIds.add(state.tool_id)
  }

  const cleanedTools = config.tools.filter((tool) => referencedToolIds.has(tool.id))

  return { ...config, tools: cleanedTools }
}

/** Removes orphaned custom nodes that are no longer referenced by any state */
const cleanupOrphanedCustomNodes = (config: WorkflowConfiguration): WorkflowConfiguration => {
  if (!config.custom_nodes || config.custom_nodes.length === 0) return config

  const referencedCustomNodeIds = new Set<string>()
  for (const state of (config.states as CustomNodeStateConfiguration[]) || []) {
    if (state.custom_node_id) referencedCustomNodeIds.add(state.custom_node_id)
  }

  const cleanedCustomNodes = config.custom_nodes.filter((customNode) =>
    referencedCustomNodeIds.has(customNode.id)
  )

  return { ...config, custom_nodes: cleanedCustomNodes }
}

/** Upserts assistants in the configuration */
const applyAssistantUpdates = (
  config: WorkflowConfiguration,
  assistantUpdates: AssistantConfiguration[]
): WorkflowConfiguration => {
  const currentAssistants = [...(config.assistants || [])]

  for (const assistantUpdate of assistantUpdates) {
    const existingIndex = currentAssistants.findIndex((item) => item.id === assistantUpdate.id)

    if (existingIndex >= 0) {
      currentAssistants[existingIndex] = assistantUpdate // Update existing
    } else {
      currentAssistants.push(assistantUpdate) // Add new
    }
  }

  return { ...config, assistants: currentAssistants }
}

/** Upserts tools in the configuration */
const applyToolUpdates = (
  config: WorkflowConfiguration,
  toolUpdates: ToolConfiguration[]
): WorkflowConfiguration => {
  const currentTools = [...(config.tools || [])]

  for (const toolUpdate of toolUpdates) {
    const existingIndex = currentTools.findIndex((item) => item.id === toolUpdate.id)

    if (existingIndex >= 0) {
      currentTools[existingIndex] = toolUpdate // Update existing
    } else {
      currentTools.push(toolUpdate) // Add new
    }
  }

  return { ...config, tools: currentTools }
}

/** Upserts custom nodes in the configuration */
const applyCustomNodeUpdates = (
  config: WorkflowConfiguration,
  customNodeUpdates: CustomNodeConfiguration[]
): WorkflowConfiguration => {
  const currentCustomNodes = [...(config.custom_nodes || [])]

  for (const customNodeUpdate of customNodeUpdates) {
    const existingIndex = currentCustomNodes.findIndex((item) => item.id === customNodeUpdate.id)

    if (existingIndex >= 0) {
      currentCustomNodes[existingIndex] = customNodeUpdate // Update existing
    } else {
      currentCustomNodes.push(customNodeUpdate) // Add new
    }
  }

  return { ...config, custom_nodes: currentCustomNodes }
}

/** Updates a state and handles ID renaming with reference updates */
const applyStateUpdate = (
  config: WorkflowConfiguration,
  stateID: string,
  stateData: Partial<StateConfiguration>
): ActionResult => {
  const stateIndex = config.states.findIndex((state) => state.id === stateID)

  if (stateIndex === -1) {
    console.warn(`State ${stateID} not found in config`)
    return { config }
  }

  const updatedState = {
    ...config.states[stateIndex],
    ...stateData,
  }

  let states = config.states.map((state, index) => (index === stateIndex ? updatedState : state))

  if (stateData.id && stateID !== stateData.id) {
    states = updateStateIDReferences(states, stateID, stateData.id)
  }

  return { config: { ...config, states } }
}

/** Base helper to update _meta.data for meta states */
const updateMetaStateData = (
  config: WorkflowConfiguration,
  stateID: string,
  stateData: Partial<StateConfiguration>
): { newStates: StateConfiguration[] | null; stateIndex: number } => {
  const newStates = [...config.states]
  const stateIndex = config.states.findIndex((state) => state.id === stateID)

  if (stateIndex === -1) {
    console.warn(`State ${stateID} not found in config`)
    return { newStates: null, stateIndex: -1 }
  }

  newStates[stateIndex] = {
    ...config.states[stateIndex],
    _meta: {
      ...config.states[stateIndex]._meta,
      data: {
        ...config.states[stateIndex]._meta?.data,
        ...stateData,
      },
    } as StateMeta,
  }

  return { newStates, stateIndex }
}

/** Updates decision meta state (conditional/switch) and syncs back to parent state */
const applyDecisionMetaStateUpdate = (
  config: WorkflowConfiguration,
  stateID: string,
  stateData: Partial<StateConfiguration>
): ActionResult => {
  const { newStates } = updateMetaStateData(config, stateID, stateData)

  if (!newStates) {
    return { config }
  }

  const parentState = newStates.find((s) => s.next?.meta_next_state_id === stateID)
  if (parentState && stateData.next) {
    const parentIndex = newStates.findIndex((s) => s.id === parentState.id)
    if (parentIndex !== -1) {
      newStates[parentIndex] = {
        ...newStates[parentIndex],
        next: {
          ...newStates[parentIndex].next,
          ...stateData.next,
        },
      }
    }
  }

  return { config: { ...config, states: newStates } }
}

/** Updates iterator meta state and propagates iter_key to parent states */
const applyIteratorMetaStateUpdate = (
  config: WorkflowConfiguration,
  stateID: string,
  stateData: Partial<StateConfiguration>
): ActionResult => {
  const { newStates } = updateMetaStateData(config, stateID, stateData)

  if (!newStates) {
    return { config }
  }

  const updatedStates = propagateIteratorKeyToParent(newStates, stateID, stateData.next?.iter_key)

  return { config: { ...config, states: updatedStates } }
}

/** Updates note meta state */
const applyNoteMetaStateUpdate = (
  config: WorkflowConfiguration,
  stateID: string,
  stateData: Partial<StateConfiguration>
): ActionResult => {
  const { newStates } = updateMetaStateData(config, stateID, stateData)

  if (!newStates) {
    return { config }
  }

  return { config: { ...config, states: newStates } }
}

/** Main entry point for state and assistant configuration updates */
export const updateStateConfigurationAction = (
  config: WorkflowConfiguration,
  update: ConfigurationUpdate
): ActionResult => {
  let updatedConfig = config

  if (update.state) {
    const state = config.states?.find((s) => s.id === update.state!.id)

    let updateFn
    if (state && isDecisionState(state)) {
      updateFn = applyDecisionMetaStateUpdate
    } else if (state && isIterator(state)) {
      updateFn = applyIteratorMetaStateUpdate
    } else if (state && isNoteState(state)) {
      updateFn = applyNoteMetaStateUpdate
    } else {
      updateFn = applyStateUpdate
    }

    const result = updateFn(updatedConfig, update.state.id, update.state.data)
    updatedConfig = result.config
  }

  if (update.actors?.assistants) {
    updatedConfig = applyAssistantUpdates(updatedConfig, update.actors.assistants)
  }
  if (update.actors?.tools) {
    updatedConfig = applyToolUpdates(updatedConfig, update.actors.tools)
  }
  if (update.actors?.customNodes) {
    updatedConfig = applyCustomNodeUpdates(updatedConfig, update.actors.customNodes)
  }

  updatedConfig = cleanupOrphanedAssistants(updatedConfig)
  updatedConfig = cleanupOrphanedTools(updatedConfig)
  updatedConfig = cleanupOrphanedCustomNodes(updatedConfig)

  return { config: updatedConfig }
}
