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
 * State Reference Update Utilities
 *
 * Functions for updating state references throughout workflow configuration.
 * All functions are pure - they do not mutate inputs.
 */

import { StateConfiguration, NextState } from '@/types/workflowEditor/configuration'

import { getStateNext } from './stateRelations'
import { isMetaState } from './stateTypeCheckers'

/**
 * Replaces target state ID in a single reference field
 */
const replaceStateId = (currentId: string, targetId: string, replacementId: string): string => {
  return currentId === targetId ? replacementId : currentId
}

/**
 * Updates single state_id reference
 */
const updateStateId = (
  stateId: string | undefined,
  targetStateID: string,
  replacementStateID: string
): string | undefined => {
  if (!stateId) return stateId
  return replaceStateId(stateId, targetStateID, replacementStateID)
}

/**
 * Updates state_ids array
 */
const updateStateIds = (
  stateIds: string[] | undefined,
  targetStateID: string,
  replacementStateID: string
): string[] | undefined => {
  if (!stateIds) return stateIds
  return stateIds.map((id) => replaceStateId(id, targetStateID, replacementStateID))
}

/**
 * Updates condition branches (then/otherwise)
 */
const updateCondition = (
  condition: NextState['condition'],
  targetStateID: string,
  replacementStateID: string
): NextState['condition'] => {
  if (!condition) return condition

  return {
    ...condition,
    then: replaceStateId(condition.then, targetStateID, replacementStateID), // nosonar
    otherwise: replaceStateId(condition.otherwise, targetStateID, replacementStateID),
  }
}

/**
 * Updates switch cases and default
 */
const updateSwitch = (
  switchConfig: NextState['switch'],
  targetStateID: string,
  replacementStateID: string
): NextState['switch'] => {
  if (!switchConfig) return switchConfig

  return {
    ...switchConfig,
    cases: switchConfig.cases.map((c) => ({
      ...c,
      state_id: replaceStateId(c.state_id, targetStateID, replacementStateID),
    })),
    default: replaceStateId(switchConfig.default, targetStateID, replacementStateID),
  }
}

/** Updates next configuration with state ID replacements */
const updateNextConfig = (
  next: NextState,
  targetStateID: string,
  replacementStateID: string
): NextState => {
  const updated: NextState = {
    ...next,
    state_id: updateStateId(next.state_id, targetStateID, replacementStateID),
    state_ids: updateStateIds(next.state_ids, targetStateID, replacementStateID),
    condition: updateCondition(next.condition, targetStateID, replacementStateID),
    switch: updateSwitch(next.switch, targetStateID, replacementStateID),
  }

  for (const key of Object.keys(updated)) {
    if (updated[key] === undefined) delete updated[key]
  }

  return updated
}

/**
 * Updates state's next configuration by replacing target state ID with replacement
 * Pure function - does not mutate input
 *
 * @param state - State to update
 * @param targetStateID - State ID to replace
 * @param replacementStateID - Replacement state ID (defaults to '' to remove reference)
 * @returns New state with updated next references
 */
export const updateStateNext = (
  state: StateConfiguration,
  targetStateID: string,
  replacementStateID: string = ''
): StateConfiguration => {
  const currentNext = getStateNext(state)
  if (!currentNext) return state

  const updatedNext = updateNextConfig(currentNext, targetStateID, replacementStateID)

  if (isMetaState(state)) {
    return {
      ...state,
      _meta: {
        ...state._meta,
        data: {
          ...state._meta!.data,
          next: updatedNext,
        },
      },
    } as StateConfiguration
  }

  return { ...state, next: updatedNext }
}
