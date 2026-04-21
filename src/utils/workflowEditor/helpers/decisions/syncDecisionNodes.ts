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
 * Decision Node Utilities
 *
 * Shared utilities for working with decision nodes (CONDITION/SWITCH)
 * Used by both createConnection and deleteConnection actions.
 */

import {
  StateConfiguration,
  WorkflowConfiguration,
  StateMeta,
} from '@/types/workflowEditor/configuration'
import { HANDLES } from '@/utils/workflowEditor/constants'

import { getStateNext, isMetaState } from '../states'

/**
 * Finds parent node ID for a decision meta node
 * Parent has meta_next_state_id pointing to the decision node
 */
export const findDecisionParent = (
  decisionNodeID: string,
  config: WorkflowConfiguration | StateConfiguration[]
): string | undefined => {
  return (Array.isArray(config) ? config : config.states).find(
    (state) => state.next?.meta_next_state_id === decisionNodeID
  )?.id
}

/**
 * Updates both decision meta node and its parent node
 * Applies handle updates to both to keep them in sync
 */
export const updateBothDecisionNodes = (
  decisionNodeID: string,
  sourceHandle: string | null | undefined,
  targetID: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const parentID = findDecisionParent(decisionNodeID, config)

  const updatedStates = config.states.map((state) => {
    if (state.id !== decisionNodeID && state.id !== parentID) return state

    const updatedCondition = updateConditionHandle(state, sourceHandle, targetID)
    if (updatedCondition) return updatedCondition

    const updatedSwitch = updateSwitchHandle(state, sourceHandle, targetID)
    if (updatedSwitch) return updatedSwitch

    return state
  })

  return {
    ...config,
    states: updatedStates,
  }
}

/**
 * Updates a condition node's then/otherwise field
 */
export const updateConditionHandle = (
  state: StateConfiguration,
  sourceHandle: string | null | undefined,
  targetID: string
): StateConfiguration | null => {
  const next = getStateNext(state)
  if (!next?.condition) return null

  const updatedCondition = {
    ...next.condition,
    ...(sourceHandle === HANDLES.THEN && { then: targetID }),
    ...(sourceHandle === HANDLES.OTHERWISE && { otherwise: targetID }),
  }

  const updatedNext = {
    ...next,
    condition: updatedCondition,
  }

  if (isMetaState(state)) {
    return {
      ...state,
      _meta: {
        ...state._meta,
        data: {
          ...state?._meta?.data,
          next: updatedNext,
        },
      } as StateMeta,
    }
  }

  return {
    ...state,
    next: updatedNext,
  }
}

/**
 * Updates a switch node's case or default field
 */
export const updateSwitchHandle = (
  state: StateConfiguration,
  sourceHandle: string | null | undefined,
  targetID: string
): StateConfiguration | null => {
  const next = getStateNext(state)
  if (!next?.switch) return null

  let updatedSwitch = next.switch

  if (sourceHandle === HANDLES.SWITCH_DEFAULT) {
    updatedSwitch = {
      ...next.switch,
      default: targetID,
    }
  } else if (sourceHandle?.startsWith(HANDLES.SWITCH_CASE_PREFIX)) {
    const caseIndex = Number.parseInt(sourceHandle.replace(HANDLES.SWITCH_CASE_PREFIX, ''), 10)
    const updatedCases = [...next.switch.cases]

    if (updatedCases[caseIndex]) {
      updatedCases[caseIndex] = {
        ...updatedCases[caseIndex],
        state_id: targetID,
      }

      updatedSwitch = {
        ...next.switch,
        cases: updatedCases,
      }
    }
  }

  const updatedNext = {
    ...next,
    switch: updatedSwitch,
  }

  if (isMetaState(state)) {
    return {
      ...state,
      _meta: {
        ...state._meta,
        data: {
          ...state?._meta?.data,
          next: updatedNext,
        },
      } as StateMeta,
    }
  }

  return {
    ...state,
    next: updatedNext,
  }
}
