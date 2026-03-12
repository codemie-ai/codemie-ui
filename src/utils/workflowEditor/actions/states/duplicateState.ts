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
 * Duplicate State Action
 *
 * Handles duplicating existing states in the workflow.
 * Preserves configuration fields but removes navigation references.
 */

import {
  WorkflowConfiguration,
  StateConfiguration,
  StateMeta,
} from '@/types/workflowEditor/configuration'
import type { ActionResult } from '@/utils/workflowEditor/actions'
import { isExecutionState, isNoteState } from '@/utils/workflowEditor/helpers/states'

const OFFSET_X = 100 // px

/** Generates incremental state ID for duplicated state */
const generateDuplicateStateID = (originalId: string, existingStates: StateConfiguration[]) => {
  const existingIDs = new Set(existingStates.map((state) => state.id))

  // Strip any existing _copy or _copy_N suffix to get the base ID
  const baseId = originalId.replace(/_copy(_\d+)?$/, '')

  let counter = 1
  let newId = `${baseId}_copy`

  while (existingIDs.has(newId)) {
    counter += 1
    newId = `${baseId}_copy_${counter}`
  }

  return newId
}

/**
 * Duplicates an existing state in the workflow
 * Preserves next configuration fields but removes navigation references
 * Execution states (assistant, tool, custom, transform) and note nodes can be duplicated
 *
 * @param stateId - The ID of the state to duplicate
 * @param config - Current workflow configuration
 * @returns Updated config with duplicated state
 */
export const duplicateStateAction = (
  stateId: string,
  config: WorkflowConfiguration
): ActionResult => {
  const stateIndex = config.states.findIndex((s) => s.id === stateId)

  if (stateIndex === -1) {
    throw new Error(`State with id "${stateId}" not found`)
  }

  const originalState = config.states[stateIndex]

  if (!isExecutionState(originalState) && !isNoteState(originalState)) {
    return { config }
  }
  const newId = generateDuplicateStateID(originalState.id, config.states)

  const duplicatedNext = originalState.next
    ? (() => {
        const {
          state_id: _state_id,
          state_ids: _state_ids,
          iter_key: _iter_key,
          condition: _condition,
          switch: _switchField,
          meta_next_state_id: _meta_next_state_id,
          meta_iter_state_id: _meta_iter_state_id,
          ...configFields
        } = originalState.next
        return Object.keys(configFields).length > 0 ? configFields : undefined
      })()
    : undefined

  const duplicatedState: StateConfiguration = {
    ...originalState,
    id: newId,
    next: duplicatedNext,
    _meta: {
      ...originalState._meta,
      id: newId,
      position: {
        x: originalState._meta?.position?.x ?? 0,
        y: (originalState._meta?.position?.y ?? 0) + OFFSET_X,
      },
      data: originalState._meta?.data ? { ...originalState._meta.data } : undefined,
      measured: undefined,
      is_connected: false,
      selected: true,
    } as StateMeta,
  }

  const newStates = config.states.map((state, index) => {
    if (index === stateIndex) {
      return {
        ...state,
        _meta: {
          ...state._meta,
          selected: false,
        } as StateMeta,
      }
    }
    return state
  })

  newStates.splice(stateIndex + 1, 0, duplicatedState)

  return { config: { ...config, states: newStates } }
}
