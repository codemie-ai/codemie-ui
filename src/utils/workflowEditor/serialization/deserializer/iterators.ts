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
 * Iterator State Processing
 *
 * Handles creation of iterator nodes for parents with iter_key.
 * Iterator nodes are created as children of parents with iter_key.
 * Children get meta_iter_state_id assigned to them.
 */

import { NodeTypes } from '@/types/workflowEditor/base'
import {
  WorkflowConfiguration,
  StateConfiguration,
  StateMeta,
} from '@/types/workflowEditor/configuration'

import { generateStateID, findDirectChildren } from '../../helpers/states'

/** Finds existing iterator ID in children */
const findExistingIteratorInChildren = (
  childIds: string[],
  states: StateConfiguration[]
): string | null => {
  for (const childId of childIds) {
    const childState = states.find((s) => s.id === childId)
    if (childState?.next?.meta_iter_state_id) {
      return childState.next.meta_iter_state_id
    }
  }
  return null
}

/** Creates a new iterator state */
const createIteratorState = (iterKey: string, states: StateConfiguration[]): StateConfiguration => {
  const iteratorId = generateStateID(NodeTypes.ITERATOR, states)
  return {
    id: iteratorId,
    _meta: {
      type: NodeTypes.ITERATOR,
      is_connected: false,
      data: { next: { iter_key: iterKey } },
    } as StateMeta,
  } as StateConfiguration
}

/**
 * Adds iterator states for parents with iter_key.
 * Two-pass approach:
 * 1. Collect all children grouped by iter_key
 * 2. Create one iterator per iter_key and assign to children
 */
export const addIteratorStates = (loadedConfig: WorkflowConfiguration): void => {
  const { states } = loadedConfig
  const iteratorsToChildren: Map<string, string[]> = new Map() // iterKey -> childIDS

  // Pass 1: Collect children grouped by iter_key
  for (const state of states) {
    const iterKey = state.next?.iter_key

    if (iterKey) {
      const childIDs = findDirectChildren(state.id, states)

      if (childIDs.length > 0) {
        const existing = iteratorsToChildren.get(iterKey) ?? []
        iteratorsToChildren.set(iterKey, [...existing, ...childIDs])
      }
    }
  }

  // // Pass 2: Create iterators and assign to children
  for (const [iterKey, childIDs] of iteratorsToChildren.entries()) {
    let iteratorID = findExistingIteratorInChildren(childIDs, states)

    if (!iteratorID || !states.some((s) => s.id === iteratorID)) {
      const iteratorState = createIteratorState(iterKey, states)
      iteratorID = iteratorState.id
      states.push(iteratorState)
    }

    for (const childId of childIDs) {
      const childState = states.find((s) => s.id === childId)
      if (childState) {
        childState.next ??= {}
        childState.next.meta_iter_state_id = iteratorID
      }
    }
  }
  loadedConfig.states = states
}
