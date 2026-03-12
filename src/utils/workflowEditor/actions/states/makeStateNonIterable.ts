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
 * Make State Non-Iterable Action
 *
 * Makes a state non-iterable by:
 * 1. Removing meta_iter_state_id from the current state
 * 2. Removing iter_key from parent state
 */

import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { ActionResult } from '@/utils/workflowEditor/actions'
import { findDirectParents, translateStateToAbsolute } from '@/utils/workflowEditor/helpers/states'

/**
 * Unlinks a state from an iterator by removing meta_iter_state_id and iter_key
 * Also translates position from relative to absolute
 */
const unlinkStateFromIterator = (stateId: string, states: StateConfiguration[]): void => {
  const stateIndex = states.findIndex((s) => s.id === stateId)
  if (stateIndex === -1) return

  const state = states[stateIndex]
  const iteratorId = state.next?.meta_iter_state_id
  const { meta_iter_state_id: _, iter_key: __, ...nextFields } = state.next || {}

  let updatedState = {
    ...state,
    next: nextFields,
  } as StateConfiguration

  if (iteratorId) {
    const iteratorState = states.find((s) => s.id === iteratorId)
    if (iteratorState) {
      updatedState = translateStateToAbsolute(updatedState, iteratorState)
    }
  }

  states[stateIndex] = updatedState
}

/**
 * Removes iter_key from parent state
 */
const removeParentIterKey = (parentId: string, states: StateConfiguration[]): void => {
  const parentIndex = states.findIndex((s) => s.id === parentId)
  if (parentIndex === -1) return

  const parentState = states[parentIndex]
  if (!parentState.next?.iter_key) return

  const { iter_key: _, ...nextFields } = parentState.next

  states[parentIndex] = {
    ...parentState,
    next: nextFields,
  }
}

/**
 * Makes a state non-iterable by removing its iterator associations
 * Removes meta_iter_state_id from the current state and iter_key from parent
 *
 * @param stateId - ID of the state to make non-iterable
 * @param config - Current workflow configuration
 * @returns Updated configuration with iterator associations removed
 */
export const makeStateNonIterableAction = (
  stateId: string,
  config: WorkflowConfiguration
): ActionResult => {
  const newStates = [...(config.states ?? [])]
  const stateIndex = newStates.findIndex((state) => state.id === stateId)

  if (stateIndex === -1) {
    console.warn(`State ${stateId} not found`)
    return { config }
  }

  unlinkStateFromIterator(stateId, newStates)

  const parentIDs = findDirectParents(stateId, newStates)

  for (const parentID of parentIDs) {
    removeParentIterKey(parentID, newStates)
  }

  return {
    config: {
      ...config,
      states: newStates,
    },
  }
}
