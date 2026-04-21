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

import { ExtendedWorkflowExecutionState, WorkflowExecutionState } from '@/types/entity'
import { NodeType, StateConfiguration } from '@/types/workflowEditor'

import { extractStateName } from './extractStateName'

/**
 * Extends execution states with resolvedId and type properties.
 * Does NOT group states - use groupIterationStates for that.
 *
 * @param states - Array of workflow execution states
 * @param configStates - Array of state configurations with type metadata
 * @returns Array of states with resolvedId and type properties
 */
export const extendExecutionStates = (
  states: WorkflowExecutionState[],
  configStates: StateConfiguration[]
): ExtendedWorkflowExecutionState[] => {
  const stateTypeMap = new Map<string, NodeType>()

  configStates.forEach((config) => {
    if (config._meta?.type) stateTypeMap.set(config.id, config._meta.type as NodeType)
  })

  return states.map((state) => {
    // Use state_id from backend if available, fallback to extracting from name
    const resolvedId = state.state_id ?? extractStateName(state.name)
    const type = stateTypeMap.get(resolvedId) ?? stateTypeMap.get(state.name) ?? null

    return {
      ...state,
      type,
      resolvedId,
    }
  })
}
