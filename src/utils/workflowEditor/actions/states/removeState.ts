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
 * Remove State Action
 *
 * Handles removing nodes from the workflow. Edge removal is triggered automatically by ReactFlow.
 * When removing an iterator, cleans up iterator references from related states.
 * Prevents deletion of START and END nodes.
 */

import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import type { ActionResult } from '@/utils/workflowEditor/actions'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'
import {
  isIteratorID,
  translateStateToAbsolute,
  cleanupUnusedReferences,
} from '@/utils/workflowEditor/helpers/states'
import { findDirectParents } from '@/utils/workflowEditor/helpers/states/stateRelations'

/**
 * Removes iterator references from states when an iterator is deleted
 * - Removes meta_iter_state_id from all states that reference this iterator
 * - Removes iter_key from parents of those states
 * - Translates child positions from relative to absolute
 */
const cleanupIteratorReferences = (
  states: StateConfiguration[],
  iteratorID: string
): StateConfiguration[] => {
  const iteratorState = states.find((s) => s.id === iteratorID)
  if (!iteratorState) {
    return states
  }

  // Find all states that reference this iterator
  const statesWithIterator = states
    .filter((state) => state.next?.meta_iter_state_id === iteratorID)
    .map((state) => state.id)

  // Find all parents of those states
  const parentsToCleanup = new Set<string>()
  for (const stateID of statesWithIterator) {
    const parents = findDirectParents(stateID, states)
    for (const parentID of parents) {
      parentsToCleanup.add(parentID)
    }
  }

  return states.map((state) => {
    let updatedState = state

    // Remove meta_iter_state_id and iter_key from states referencing this iterator
    if (updatedState.next?.meta_iter_state_id === iteratorID) {
      const { meta_iter_state_id: _, iter_key: __, ...nextWithoutMetaIter } = updatedState.next
      updatedState = {
        ...updatedState,
        next: nextWithoutMetaIter,
      }

      // Translate position to absolute
      updatedState = translateStateToAbsolute(updatedState, iteratorState)
    }

    // Remove iter_key from parent states
    if (parentsToCleanup.has(state.id) && updatedState.next?.iter_key) {
      const { iter_key: _, ...nextWithoutIterKey } = updatedState.next
      updatedState = {
        ...updatedState,
        next: nextWithoutIterKey,
      }
    }

    return updatedState
  })
}

export const removeStateAction = (stateID: string, config: WorkflowConfiguration): ActionResult => {
  if (stateID === START_NODE_ID || stateID === END_NODE_ID) {
    return { config }
  }

  let updatedConfig = config

  if (isIteratorID(stateID)) {
    const states = cleanupIteratorReferences(config.states ?? [], stateID)
    const filteredStates = states.filter((state) => state.id !== stateID)
    updatedConfig = { ...config, states: filteredStates }
  } else {
    const states = config.states?.filter((state) => state.id !== stateID) || []
    updatedConfig = { ...config, states }
  }

  // Cleanup unused assistants, tools, and custom_nodes
  updatedConfig = cleanupUnusedReferences(updatedConfig)

  return { config: updatedConfig }
}
