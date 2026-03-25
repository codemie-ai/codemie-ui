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
 * Configuration Deserializer
 *
 * Converts workflow YAML configuration into WorkflowConfiguration objects.
 *
 * Flow:
 * 1. Parse YAML string
 * 2. Clean up meta states (remove references to non-existent workflow states)
 * 3. Add START boundary node
 * 4. Detect orphaned states (not reachable from entry point)
 * 5. Process connected states with decision nodes
 * 6. Process orphaned states
 * 7. Process orphaned meta states (decision nodes without parent)
 * 8. Add END boundary node
 */

import yaml from 'js-yaml'
import isObject from 'lodash/isObject'

import { NodeTypes, MetaNodeTypes } from '@/types/workflowEditor/base'
import {
  WorkflowConfiguration,
  StateConfiguration,
  StateMeta,
} from '@/types/workflowEditor/configuration'
import toaster from '@/utils/toaster'

import { addIteratorStates } from './iterators'
import { START_NODE_ID, END_NODE_ID, TRANSFORM_CUSTOM_ACTOR_ID } from '../../constants'
import { findEntryState, findOrphanedStates } from '../../helpers/connections'
import { generateStateID } from '../../helpers/states'
import { SerializedWorkflowConfig, SerializedState, SerializedMetaState } from '../types'

/** Parses YAML string into SerializedWorkflowConfig */
const parseYaml = (yamlString: string): SerializedWorkflowConfig => {
  try {
    const config = yaml.load(yamlString, { json: true }) as SerializedWorkflowConfig // json: true allows duplicate keys

    if (!config || !isObject(config)) {
      return { states: [] }
    }

    return config
  } catch (error: any) {
    throw new Error(`Failed to parse workflow configuration: ${error.message}`)
  }
}

/** Infers node type from state properties */
const inferNodeType = (state: SerializedState): string => {
  if (state.assistant_id) return NodeTypes.ASSISTANT
  if (state.tool_id) return NodeTypes.TOOL
  if (state.custom_node_id === TRANSFORM_CUSTOM_ACTOR_ID) return NodeTypes.TRANSFORM
  if (state.custom_node_id) return NodeTypes.CUSTOM
  return NodeTypes.CUSTOM
}

/** Creates metadata for a state node */
const createStateMeta = (
  metaStates: SerializedMetaState[],
  state: SerializedState,
  isConnected: boolean
): StateMeta => {
  const metaState = metaStates.find((meta) => meta.id === state.id) ?? {
    type: inferNodeType(state),
  }

  return {
    ...metaState,
    is_connected: isConnected,
  } as StateMeta
}

/** Strips meta_next_state_id from next configuration */
const stripMetaNextStateId = (data: any): any => {
  if (data?.next?.meta_next_state_id) {
    const { meta_next_state_id: _, ...nextWithoutMetaId } = data.next
    return { ...data, next: nextWithoutMetaId }
  }
  return data
}

/**
 Cleans up meta states that reference non-meta nodes (assistant/tool/custom) 
 which don't exist in either states or orphaned_states (deleted manually) 
*/
const cleanupMetaStates = (
  metaStates: SerializedMetaState[],
  states: SerializedState[],
  orphanedStates: SerializedState[]
): SerializedMetaState[] => {
  const allStateIDs = new Set([...states.map((s) => s.id), ...orphanedStates.map((s) => s.id)])

  return metaStates.filter((metaState) => {
    const isMetaNode = MetaNodeTypes.includes(metaState.type)
    if (isMetaNode) return true

    return allStateIDs.has(metaState.id)
  })
}

const fixForbiddenStateIDs = (states: SerializedState[]) => {
  return states.map((state) => {
    if (state.id && [START_NODE_ID, END_NODE_ID].includes(state.id.toLowerCase())) {
      state.id += '_state'
    }

    return state
  })
}

/** Creates a decision node if state has condition or switch */
const createBranchState = (
  metaStates: SerializedMetaState[],
  state: SerializedState,
  isConnected: boolean,
  existingStates: StateConfiguration[]
): StateConfiguration | null => {
  if (!state.next?.condition && !state.next?.switch) {
    return null
  }

  const nodeType = state.next.condition ? NodeTypes.CONDITIONAL : NodeTypes.SWITCH
  const { meta_next_state_id: metaStateID, ...nextWithoutMetaId } = state.next
  const branchId = metaStateID || generateStateID(nodeType, existingStates)
  const metaState = metaStateID ? metaStates.find((meta) => meta.id === metaStateID) ?? {} : {}

  return {
    id: branchId,
    _meta: {
      ...metaState,
      type: nodeType,
      is_connected: isConnected,
      data: { next: nextWithoutMetaId },
    } as StateMeta,
  } as StateConfiguration
}

/** Processes states and adds them to configuration */
const processStates = (
  states: SerializedState[],
  metaStates: SerializedMetaState[],
  config: WorkflowConfiguration,
  isConnected: boolean
): void => {
  for (const state of states) {
    const loadedState: StateConfiguration = {
      ...state,
      _meta: createStateMeta(metaStates, state, isConnected),
    }

    // Handle branch states (condition/switch)
    const branchState = createBranchState(metaStates, state, isConnected, config.states)
    if (branchState) {
      loadedState.next ??= {}
      loadedState.next.meta_next_state_id = branchState.id
      config.states.push(loadedState, branchState)
    } else {
      config.states.push(loadedState)
    }
  }
}

/** Processes orphaned meta states (decision nodes without parent) */
const processOrphanedMetaStates = (
  metaStates: SerializedMetaState[],
  loadedConfig: WorkflowConfiguration
): void => {
  for (const metaState of metaStates) {
    const exists = loadedConfig.states.some((s) => s.id === metaState.id)

    if (!exists) {
      const cleanedData = stripMetaNextStateId(metaState.data)

      loadedConfig.states.push({
        id: metaState.id,
        _meta: {
          ...metaState,
          data: cleanedData,
          is_connected: false,
        },
      } as StateConfiguration)
    }
  }
}

/** Adds boundary state (START/END) to configuration */
const addBoundaryState = (
  id: string,
  type: string,
  metaStates: SerializedMetaState[],
  loadedConfig: WorkflowConfiguration,
  is_connected: boolean = true
): void => {
  const exists = metaStates.find((meta) => meta.id === id)
  if (exists) return

  loadedConfig.states.push({
    id,
    _meta: {
      type,
      is_connected,
    },
  } as StateConfiguration)
}

/** Finds orphaned state IDs (states not reachable from entry point) */
const getOrphanedStateIDs = (states: StateConfiguration[]): Set<string> => {
  const entryState = findEntryState(states)
  if (!entryState) return new Set(states.map((state) => state.id))

  return findOrphanedStates(states, entryState.id)
}

/** Deserializes YAML string into WorkflowConfiguration */
export const deserialize = (yamlString: string): WorkflowConfiguration => {
  let config

  try {
    config = parseYaml(yamlString)
  } catch (e) {
    toaster.error(`Failed loading YAML config: ${e}`)
    config = { states: [], orphaned_states: [], meta_states: [] }
  }

  const {
    states: rawStates = [],
    orphaned_states: rawOrphanedStates = [],
    meta_states: rawMetaStates = [],
    ...rest
  } = config

  const states = fixForbiddenStateIDs(rawStates ?? [])
  const orphanedStates = fixForbiddenStateIDs(rawOrphanedStates ?? [])
  const metaStates = cleanupMetaStates(rawMetaStates ?? [], states, orphanedStates)

  const loadedConfig: WorkflowConfiguration = {
    states: [],
    ...rest,
  }

  addBoundaryState(START_NODE_ID, NodeTypes.START, metaStates, loadedConfig)

  const orphanedStateIDs = getOrphanedStateIDs(states)
  const connectedStates = states.filter((state) => !orphanedStateIDs.has(state.id))
  const detectedOrphans = states.filter((state) => orphanedStateIDs.has(state.id))

  processStates(connectedStates, metaStates, loadedConfig, true)
  processStates([...orphanedStates, ...detectedOrphans], metaStates, loadedConfig, false)
  processOrphanedMetaStates(metaStates, loadedConfig)

  addIteratorStates(loadedConfig)

  addBoundaryState(END_NODE_ID, NodeTypes.END, metaStates, loadedConfig)

  return loadedConfig
}
