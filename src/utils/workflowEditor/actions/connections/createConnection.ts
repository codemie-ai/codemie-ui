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
 * Create Connection Action
 *
 * Handles connection creation in workflow configuration.
 * Updates state configuration based on connection type (START, direct, decision).
 * Pure function - does not mutate inputs.
 */

import { Connection } from '@xyflow/react'

import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { END_NODE_ID, START_NODE_ID } from '@/utils/workflowEditor/constants'
import {
  markConnectedStates,
  markStatesConnectedFrom,
} from '@/utils/workflowEditor/helpers/connections'
import { updateBothDecisionNodes } from '@/utils/workflowEditor/helpers/decisions'
import { isMetaState } from '@/utils/workflowEditor/helpers/states'

import type { ActionResult } from '../index'

/**
 * Creates connection from START node to entry state
 * Marks the target and all reachable states as connected
 * Sorts states so the target state is first
 */
const createStartConnection = (
  targetID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const updatedStates = markConnectedStates(config.states, targetID)

  // Sort states so the target state is first
  const sortedStates = [
    ...updatedStates.filter((state) => state.id === targetID),
    ...updatedStates.filter((state) => state.id !== targetID),
  ]

  return {
    ...config,
    states: sortedStates,
  }
}

/**
 * Creates direct connection from regular node to regular node
 * Handles single (state_id) and multiple (state_ids) targets
 */
const createDirectConnection = (
  sourceID: string,
  targetID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const updatedStates = config.states.map((state) => {
    if (state.id !== sourceID) return state

    const { iter_key, meta_iter_state_id } = state.next || {}

    // Check if connection already exists
    if (state.next?.state_id === targetID) {
      return state // Connection already exists, no change
    }

    if (state.next?.state_ids?.includes(targetID)) {
      return state // Connection already exists in array, no change
    }

    if (state.next?.state_id === '') {
      return {
        ...state,
        next: { state_id: targetID, iter_key, meta_iter_state_id },
      }
    }

    // Existing state_id - convert to array
    if (state.next?.state_id) {
      return {
        ...state,
        next: { state_ids: [state.next.state_id, targetID], iter_key, meta_iter_state_id },
      }
    }

    // Existing state_ids - append target
    if (state.next?.state_ids) {
      return {
        ...state,
        next: { state_ids: [...state.next.state_ids, targetID], iter_key, meta_iter_state_id },
      }
    }

    // No next - create with state_id
    return {
      ...state,
      next: { state_id: targetID, iter_key, meta_iter_state_id },
    }
  })

  return {
    ...config,
    states: updatedStates,
  }
}

/**
 * Creates connection from regular node to decision meta node (CONDITION/SWITCH)
 * Links decision node to source by copying decision logic and setting meta_next_state_id
 */
const createToDecisionConnection = (
  sourceID: string,
  metaNodeID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const metaState = config.states.find((s) => s.id === metaNodeID)
  if (!metaState) return config

  const updatedStates = config.states.map((state) => {
    // Clear old parent link if decision node was linked to another node
    if (state.next?.meta_next_state_id === metaNodeID) {
      const { iter_key, meta_iter_state_id } = state.next || {}
      return {
        ...state,
        next: { state_id: '', iter_key, meta_iter_state_id },
      } as StateConfiguration
    }

    // Link decision to source node
    if (state.id === sourceID) {
      const { iter_key, meta_iter_state_id } = state.next || {}
      const metaNext = metaState._meta?.data?.next

      // Copy decision logic but exclude iter_key and meta_iter_state_id
      const { iter_key: _, meta_iter_state_id: __, ...decisionLogic } = metaNext || {}

      return {
        ...state,
        next: {
          ...decisionLogic,
          meta_next_state_id: metaState.id,
          iter_key,
          meta_iter_state_id,
        },
      } as StateConfiguration
    }

    return state
  })

  return {
    ...config,
    states: updatedStates,
  }
}

/**
 * Creates connection from decision meta node to target state
 * Updates specific handle (then/otherwise/case/default)
 * Updates both meta node and its parent to keep them in sync
 */
const createFromDecisionConnection = (
  sourceID: string,
  targetID: string,
  sourceHandle: string | null | undefined,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const sourceState = config.states.find((s) => s.id === sourceID)
  if (!sourceState) return config

  return updateBothDecisionNodes(sourceID, sourceHandle, targetID, config)
}

/**
 * Creates a connection in the workflow configuration
 *
 * Routes to handler based on connection type:
 * - START → any: Mark target as entry point and propagate connectivity
 * - Regular → Decision meta: Link decision logic to source node
 * - Decision meta → Regular: Set specific handle target (then/otherwise/case/default)
 * - Regular → Regular: Create direct transition (single or multiple targets)
 *
 * Special: END node is treated as regular despite being meta
 *
 * @param connection - ReactFlow connection (source, target, sourceHandle)
 * @param config - Current workflow configuration
 * @returns Updated configuration
 */
export const createConnectionAction = (
  connection: Connection,
  config: WorkflowConfiguration
): ActionResult => {
  const { source, target, sourceHandle } = connection

  if (!source || !target) {
    console.warn('[createConnectionAction] Missing source or target')
    return { config }
  }

  const sourceState = config.states.find((s) => s.id === source)
  const targetState = config.states.find((s) => s.id === target)

  if (!sourceState || !targetState) {
    console.warn('[createConnectionAction] Source or target state not found')
    return { config }
  }

  // END node is treated as regular despite being meta
  const isSourceMeta = isMetaState(sourceState)
  const isTargetMeta = isMetaState(targetState) && target !== END_NODE_ID

  // Disallow meta to meta connections (except to END)
  if (isSourceMeta && isTargetMeta) {
    console.warn('[createConnectionAction] Cannot connect meta to meta')
    return { config }
  }

  let newConfig

  if (source === START_NODE_ID) {
    newConfig = createStartConnection(target, config)
  } else if (!isSourceMeta && isTargetMeta) {
    newConfig = createToDecisionConnection(source, target, config)
  } else if (isSourceMeta && !isTargetMeta) {
    newConfig = createFromDecisionConnection(source, target, sourceHandle, config)
  } else {
    newConfig = createDirectConnection(source, target, config)
  }

  // Propagate connectivity if source is connected
  if (sourceState._meta?.is_connected) {
    newConfig.states = markStatesConnectedFrom(newConfig.states, target)
  }

  return { config: newConfig }
}
