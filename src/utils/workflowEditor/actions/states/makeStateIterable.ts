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
 * Make State Iterable Action
 *
 * Makes a state iterable by adding it to an iterator parent.
 * Sets the meta_iter_state_id field on the state and iter_key on parent.
 */

import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { ActionResult } from '@/utils/workflowEditor/actions'
import { findDirectParents } from '@/utils/workflowEditor/helpers/states'

/**
 * Links a state to an iterator by setting meta_iter_state_id
 */
const linkStateToIterator = (
  stateId: string,
  iteratorId: string,
  states: StateConfiguration[]
): void => {
  const stateIndex = states.findIndex((s) => s.id === stateId)
  if (stateIndex === -1) return

  const state = states[stateIndex]

  states[stateIndex] = {
    ...state,
    next: {
      ...state.next,
      meta_iter_state_id: iteratorId,
    },
  }
}

/**
 * Updates parent state's iter_key to match the iterator's iter_key
 */
const updateParentIterKey = (
  stateId: string,
  iterKey: string | undefined,
  states: StateConfiguration[]
): void => {
  const parents = findDirectParents(stateId, states)

  // Only update parent if state has exactly one parent
  if (parents.length !== 1) return

  const parentId = parents[0]
  const parentIndex = states.findIndex((s) => s.id === parentId)

  if (parentIndex === -1) return

  states[parentIndex] = {
    ...states[parentIndex],
    next: {
      ...states[parentIndex].next,
      iter_key: iterKey,
    },
  }
}

/**
 * Makes a state iterable by associating it with an iterator parent
 * If the state has siblings (parent with multiple children), adds all siblings to the iterator
 * Updates parent state's iter_key to match the iterator's iter_key
 *
 * @param stateId - ID of the state to make iterable
 * @param iteratorId - ID of the iterator parent
 * @param config - Current workflow configuration
 * @returns Updated configuration with iterator parent reference and iter_key added
 */
export const makeStateIterableAction = (
  stateId: string,
  iteratorId: string,
  config: WorkflowConfiguration
): ActionResult => {
  const newStates = [...(config.states ?? [])]
  const stateIndex = newStates.findIndex((state) => state.id === stateId)

  if (stateIndex === -1) {
    console.warn(`State ${stateId} not found`)
    return { config }
  }

  const iteratorState = config.states.find((state) => state.id === iteratorId)
  if (!iteratorState) {
    console.warn(`Iterator ${iteratorId} not found`)
    return { config }
  }

  const iterKey = iteratorState._meta?.data?.next?.iter_key

  linkStateToIterator(stateId, iteratorId, newStates)
  updateParentIterKey(stateId, iterKey, newStates)

  return {
    config: {
      ...config,
      states: newStates,
    },
  }
}
