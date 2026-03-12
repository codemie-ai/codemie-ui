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
 * State Relations Helpers
 *
 * Functions for finding relationships between states in the workflow graph.
 */

import { StateConfiguration, NextState } from '@/types/workflowEditor/configuration'

import { isMetaState, hasConditionLogic, hasSwitchLogic } from './stateTypeCheckers'
import { END_NODE_ID, START_NODE_ID } from '../../constants'

/**
 * Gets the next state configuration from a state
 * Handles both regular states and meta states
 */
export const getStateNext = (state: StateConfiguration | null): NextState => {
  if (!state) return {}
  if (isMetaState(state)) return state._meta?.data?.next

  return state.next
}

/**
 * Finds all parent states that reference a given state as a child.
 * Only looks at direct connections (state_id and state_ids).
 *
 * @param stateID - The ID of the state to find parents for
 * @param states - Array of all states in the workflow
 * @returns Array of parent state IDs that reference the given state
 */
export const findDirectParents = (stateID: string, states: StateConfiguration[]): string[] => {
  const parents: string[] = []

  for (const state of states) {
    const childStateID = state.next?.state_id
    const childStateIDs = state.next?.state_ids

    const hasChild = childStateID === stateID || childStateIDs?.includes(stateID)

    if (hasChild) {
      parents.push(state.id)
    }
  }

  return parents
}

/**
 * Finds all parent states that reference a given state as a child.
 * Includes parents connected via decision nodes (condition/switch).
 *
 * @param stateID - The ID of the state to find parents for
 * @param states - Array of all states in the workflow
 * @returns Array of parent state IDs that reference the given state (directly or via decision nodes)
 */
export const findParents = (stateID: string, states: StateConfiguration[]): string[] => {
  const parents: string[] = []

  for (const state of states) {
    const next = getStateNext(state)

    if (next) {
      const hasDirectReference = next.state_id === stateID || next.state_ids?.includes(stateID)
      const hasConditionReference =
        hasConditionLogic(state) &&
        (next.condition?.then === stateID || next.condition?.otherwise === stateID)
      const hasSwitchReference =
        hasSwitchLogic(state) &&
        (next.switch?.cases.some((c) => c.state_id === stateID) || next.switch?.default === stateID)

      if (hasDirectReference || hasConditionReference || hasSwitchReference) {
        parents.push(state.id)
      }
    }
  }

  return parents
}

/**
 * Finds all child state IDs from a state's next configuration
 * Includes all possible next states (direct, condition branches, switch cases, multiple next states)
 *
 * @param state - The state to find children for
 * @returns Array of all child state IDs
 */
export const findChildren = (state: StateConfiguration): string[] => {
  const next = getStateNext(state)
  if (!next) return []

  const childIds: string[] = []

  if (next.state_id) {
    childIds.push(next.state_id)
  }

  if (next.state_ids) {
    childIds.push(...next.state_ids)
  }

  if (next.condition) {
    childIds.push(next.condition.then, next.condition.otherwise)
  }

  if (next.switch) {
    childIds.push(...next.switch.cases.map((c) => c.state_id), next.switch.default)
  }

  return childIds
}

/**
 * Finds all direct children of a given state.
 *
 * @param stateID - The ID of the state to find children for
 * @param states - Array of all states in the workflow
 * @returns Array of child state IDs
 */
export const findDirectChildren = (stateID: string, states: StateConfiguration[]): string[] => {
  const state = states.find((s) => s.id === stateID)
  const validStateIDs = new Set(
    states.map((state) => state.id).filter((id) => ![START_NODE_ID, END_NODE_ID].includes(id))
  )

  if (!state?.next) return []

  const childIDs: string[] = []
  if (state.next.state_id) childIDs.push(state.next.state_id)
  if (state.next.state_ids) childIDs.push(...state.next.state_ids)

  return childIDs.filter((id) => validStateIDs.has(id))
}
