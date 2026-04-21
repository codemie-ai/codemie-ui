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
 * Delete Connection Action
 *
 * Handles connection deletion in workflow configuration.
 * Removes the target reference from the source node's next configuration.
 * Always removes meta_iter_state_id from the target node.
 * Pure function - does not mutate inputs.
 */

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ActionResult } from '@/utils/workflowEditor/actions'
import { START_NODE_ID } from '@/utils/workflowEditor/constants'
import { updateBothDecisionNodes } from '@/utils/workflowEditor/helpers/decisions'
import {
  isMetaState,
  isDecisionState,
  isIteratorParent,
} from '@/utils/workflowEditor/helpers/states'

import { makeStateNonIterableAction } from '../states/makeStateNonIterable'

/**
 * Deletes connection from START node
 * Sets all nodes as is_connected: false (no entry point exists)
 */
const deleteStartConnection = (config: WorkflowConfiguration): WorkflowConfiguration => {
  const updatedStates = config.states.map((state) => {
    if (isMetaState(state)) return state

    return {
      ...state,
      _meta: {
        ...state._meta,
        is_connected: false,
      },
    }
  })

  return {
    ...config,
    states: updatedStates,
  } as WorkflowConfiguration
}

/**
 * Deletes connection from decision meta node (condition/switch)
 * Clears specific handle by setting it to empty string
 */
const deleteFromDecisionConnection = (
  sourceID: string,
  sourceHandle: string | null | undefined,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  return updateBothDecisionNodes(sourceID, sourceHandle, '', config)
}

/**
 * Deletes connection TO decision meta node (regular → decision)
 * Clears meta_next_state_id from source node
 */
const deleteToDecisionConnection = (
  sourceID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const updatedStates = config.states.map((state) => {
    if (state.id !== sourceID) return state

    const {
      meta_next_state_id: _meta_next_state,
      condition: _condition,
      switch: _switch,
      state_ids: _state_ids,
      ...restNext
    } = state.next || {}

    return {
      ...state,
      next: { ...restNext, state_id: '' },
    }
  })

  return {
    ...config,
    states: updatedStates,
  }
}

/**
 * Deletes direct connection from regular node
 * Handles both single (state_id) and multiple (state_ids) targets
 * Converts state_ids back to state_id if only one connection remains
 */
const deleteDirectConnection = (
  sourceID: string,
  targetID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const updatedStates = config.states.map((state) => {
    if (state.id !== sourceID) return state

    if (state.next?.state_ids) {
      const remainingIds = state.next.state_ids.filter((id) => id !== targetID)

      if (remainingIds.length === 1) {
        const { state_ids: _, ...restNext } = state.next
        return {
          ...state,
          next: {
            ...restNext,
            state_id: remainingIds[0],
          },
        }
      }

      return {
        ...state,
        next: {
          ...state.next,
          state_ids: remainingIds,
        },
      }
    }

    return {
      ...state,
      next: { ...state.next, state_id: '' },
    }
  })

  return {
    ...config,
    states: updatedStates,
  }
}

/* Removes iter_key from a state and translates child coordinates to absolute */
const removeIterKey = (stateID: string, config: WorkflowConfiguration): WorkflowConfiguration => {
  const updatedStates = config.states.map((s) => {
    if (s.id !== stateID) return s

    const { iter_key: _, ...nextFields } = s.next
    return {
      ...s,
      next: nextFields,
    }
  })

  return { ...config, states: updatedStates }
}

/**
 * Deletes a connection from the workflow configuration
 *
 * Routes to handler based on connection type:
 * - START → Mark all nodes as disconnected
 * - Decision meta → Regular: Clear specific handle (then/otherwise/case/default)
 * - Regular → Decision meta: Clear decision link from source
 * - Regular → Regular: Remove target from next configuration
 *
 * After deletion, calls makeStateNonIterable on target if it has meta_iter_state_id.
 * This removes the target from its iterator and cleans up parent iter_key if no children remain.
 *
 * @param sourceID - Source node ID
 * @param targetID - Target node ID
 * @param sourceHandle - Source handle ID (for decision nodes)
 * @param config - Current workflow configuration
 * @returns Updated configuration
 */
export const deleteConnectionAction = (
  sourceID: string,
  targetID: string,
  sourceHandle: string | null | undefined,
  config: WorkflowConfiguration
): ActionResult => {
  const sourceState = config.states.find((state) => state.id === sourceID)
  const targetState = config.states.find((state) => state.id === targetID)

  if (!sourceState) {
    return { config }
  }

  let updatedConfig = config

  if (targetState?.next?.meta_iter_state_id) {
    updatedConfig = makeStateNonIterableAction(targetID, updatedConfig).config
  }

  const isSourceDecision = isDecisionState(sourceState)
  const isTargetDecisiotn = targetState && isDecisionState(targetState)

  if (sourceID === START_NODE_ID) {
    updatedConfig = deleteStartConnection(updatedConfig)
  } else if (isSourceDecision) {
    // Decision meta → Regular: clear specific handle
    updatedConfig = deleteFromDecisionConnection(sourceID, sourceHandle, updatedConfig)
  } else if (isTargetDecisiotn) {
    // Regular → Decision meta: clear decision link
    updatedConfig = deleteToDecisionConnection(sourceID, updatedConfig)
  } else {
    // Regular → Regular: clear direct connection
    updatedConfig = deleteDirectConnection(sourceID, targetID, updatedConfig)
  }

  if (isIteratorParent(sourceState)) {
    updatedConfig = removeIterKey(sourceID, updatedConfig)
  }

  return { config: updatedConfig }
}
