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
 * Connection Utilities
 *
 * Shared utilities for finding entry states and checking connections
 */

import { StateConfiguration } from '@/types/workflowEditor/configuration'

import { findChildren, isMetaState } from '../states'

/* Returns the first state always assuming it's and entry state */
export const findEntryState = (states: StateConfiguration[]): StateConfiguration | null => {
  return states[0]
}

/**
 * Finds first connected entry state (marked as is_connected and has no incoming edges)
 * Used after initial load to find the workflow starting point
 */
export const findConnectedEntryState = (
  states: StateConfiguration[]
): StateConfiguration | null => {
  const connectedStates = states.filter(
    (state) => !isMetaState(state) && state._meta?.is_connected === true
  )

  return findEntryState(connectedStates)
}

/**
 * Helper: Recursively collects reachable state IDs from a starting state
 */
const collectReachableStateIds = (
  stateID: string,
  statesMap: Map<string, StateConfiguration>,
  states: StateConfiguration[],
  visited: Set<string> = new Set()
): Set<string> => {
  if (!stateID || stateID === '') return visited
  if (visited.has(stateID) || !statesMap.has(stateID)) return visited

  const newVisited = new Set(visited)
  newVisited.add(stateID)

  const state = statesMap.get(stateID)!
  const childIds = findChildren(state)

  let result = newVisited
  for (const childId of childIds) {
    if (childId && childId !== '') {
      result = collectReachableStateIds(childId, statesMap, states, result)
    }
  }

  return result
}

/**
 * Finds orphaned states (states not reachable from the entry state)
 *
 * @param states - All workflow states
 * @param entryStateId - Starting state ID for traversal
 * @returns Set of state IDs that are orphaned (not reachable)
 */
export const findOrphanedStates = (
  states: StateConfiguration[],
  entryStateId: string
): Set<string> => {
  if (!states.length) return new Set()

  const statesMap = new Map(states.map((state) => [state.id, state]))
  const reachableStateIds = collectReachableStateIds(entryStateId, statesMap, states)

  const orphanedStateIds = new Set<string>()
  for (const state of states) {
    if (!reachableStateIds.has(state.id)) {
      orphanedStateIds.add(state.id)
    }
  }

  return orphanedStateIds
}

/**
 * Marks all states reachable from entry state as connected, others as disconnected
 *
 * @param states - All workflow states
 * @param entryStateId - Starting state ID for traversal
 * @returns Updated states with is_connected flags
 */
export const markConnectedStates = (
  states: StateConfiguration[],
  entryStateId: string
): StateConfiguration[] => {
  if (!states.length) return states

  const statesMap = new Map(states.map((state) => [state.id, state]))
  const reachableStateIds = collectReachableStateIds(entryStateId, statesMap, states)

  return states.map(
    (state) =>
      ({
        ...state,
        _meta: {
          ...state._meta,
          is_connected: reachableStateIds.has(state.id),
        },
      } as StateConfiguration)
  )
}

/**
 * Marks all states reachable from a given state as connected (doesn't unmark anything)
 * More efficient for partial updates when adding connections
 *
 * @param states - All workflow states
 * @param startStateId - State ID to start traversal from
 * @returns Updated states with newly reachable states marked as connected
 */
export const markStatesConnectedFrom = (
  states: StateConfiguration[],
  startStateId: string
): StateConfiguration[] => {
  if (!states.length) return states

  const statesMap = new Map(states.map((state) => [state.id, state]))
  const reachableStateIds = collectReachableStateIds(startStateId, statesMap, states)

  return states.map((state) => {
    // If state is reachable from startState, mark as connected
    if (reachableStateIds.has(state.id)) {
      return {
        ...state,
        _meta: {
          ...state._meta,
          is_connected: true,
        },
      } as StateConfiguration
    }
    // Otherwise keep existing connection status
    return state
  })
}
