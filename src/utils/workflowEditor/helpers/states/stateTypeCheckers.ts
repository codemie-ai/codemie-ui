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
 * State Checkers
 *
 * Boolean functions for checking state properties
 */

import { MetaNodeTypes, NodeTypes } from '@/types/workflowEditor/base'
import { StateConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ITERATOR_ID_PREFIX } from '@/utils/workflowEditor/constants'

import { getStateNext } from './stateRelations'

export const isMetaState = (state: StateConfiguration | null): boolean => {
  if (!state?._meta?.type) return false
  return MetaNodeTypes.includes(state._meta.type)
}

export const isExecutionState = (state: StateConfiguration | null): boolean => {
  if (!state?._meta?.type) return false
  return [NodeTypes.ASSISTANT, NodeTypes.TOOL, NodeTypes.CUSTOM, NodeTypes.TRANSFORM].includes(
    state._meta.type as any
  )
}

export const isDecisionState = (state: StateConfiguration): boolean => {
  if (!state?._meta?.type) return false
  return [NodeTypes.CONDITIONAL, NodeTypes.SWITCH].includes(state._meta.type as any)
}

/* Check if a state configuration is an iterator (by type) */
export const isIterator = (state: StateConfiguration): boolean => {
  return state._meta?.type === NodeTypes.ITERATOR
}

/* Check if a state ID is an iterator ID (by prefix) */
export const isIteratorID = (stateId: string): boolean => {
  return stateId.startsWith(ITERATOR_ID_PREFIX)
}

export const isNoteState = (state: StateConfiguration | null): boolean => {
  if (!state?._meta?.type) return false
  return state._meta.type === NodeTypes.NOTE
}

export const isIteratorParent = (state: StateConfiguration): boolean => {
  return !!state.next?.iter_key
}

export const isConnected = (state: StateConfiguration | null): boolean => {
  if (!state) return false
  return state._meta?.is_connected ?? false
}

export const hasConditionLogic = (state: StateConfiguration): boolean => {
  const next = getStateNext(state)
  return !!next?.condition
}

export const hasSwitchLogic = (state: StateConfiguration): boolean => {
  const next = getStateNext(state)
  return !!next?.switch
}

export const hasMultipleNextStates = (state: StateConfiguration): boolean => {
  const next = getStateNext(state)
  return !!next?.state_ids && next.state_ids.length > 0
}

/* Check if a state has decision logic (condition or switch) */
export const hasDecisionLogic = (state: StateConfiguration): boolean => {
  const next = getStateNext(state)
  return !!(next?.condition || next?.switch)
}

/**
 * Gets the decision node ID for a state with decision logic
 * Finds the condition/switch node by looking for meta_next_state_id
 */
export const getDecisionNodeId = (
  parentState: StateConfiguration,
  config: WorkflowConfiguration
): string | null => {
  const decisionState = config.states?.find(
    (state) => state.id === parentState.next?.meta_next_state_id
  )
  return decisionState?.id ?? null
}
