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
 * Configuration Serializer
 *
 * Converts WorkflowConfiguration objects to YAML format.
 *
 * Flow:
 * 1. Categorize states into connected, orphaned, and meta collections
 * 2. Strip _meta from regular states
 * 3. Save meta state data with cleaned next configuration
 * 4. Build serialized config with proper ordering
 * 5. Dump to YAML with formatting
 */

import yaml from 'js-yaml'

import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'

import { SerializedWorkflowConfig, SerializedState, SerializedMetaState } from './types'
import { isMetaState, isConnected } from '../helpers/states'

/** Strips _meta from state */
const stripMeta = (state: StateConfiguration): SerializedState => {
  const { _meta, ...stateWithoutMeta } = state
  return stateWithoutMeta as SerializedState
}

/** Strips meta_next_state_id from state's next configuration */
const stripMetaNextStateId = (state: SerializedState): SerializedState => {
  if (state.next?.meta_next_state_id) {
    const { meta_next_state_id: _, ...nextWithoutMetaId } = state.next
    return { ...state, next: nextWithoutMetaId }
  }
  return state
}

/** Converts state _meta to serialized meta state */
const createMetaState = (state: StateConfiguration): SerializedMetaState => {
  return {
    ...state._meta,
    id: state.id,
  } as SerializedMetaState
}

/** Converts meta state with data (for decision nodes) */
const createMetaStateWithData = (state: StateConfiguration): SerializedMetaState => {
  const dataToSerialize = state._meta?.data || {}
  const cleanedData = stripMetaNextStateId(dataToSerialize)

  return {
    id: state.id,
    ...state._meta,
    data: cleanedData,
  } as SerializedMetaState
}

/** Processes meta state (decision nodes, start, end) */
const processMetaState = (state: StateConfiguration, metaStates: SerializedMetaState[]) => {
  const metaState = createMetaStateWithData(state)
  metaStates.push(metaState)
}

/** Processes connected workflow state */
const processConnectedState = (
  state: StateConfiguration,
  serializedStates: SerializedState[],
  metaStates: SerializedMetaState[]
) => {
  serializedStates.push(stripMeta(state))

  if (state._meta) {
    metaStates.push(createMetaState(state))
  }
}

/** Processes orphaned workflow state */
const processOrphanedState = (
  state: StateConfiguration,
  orphanedStates: SerializedState[],
  metaStates: SerializedMetaState[]
) => {
  orphanedStates.push(stripMeta(state))
  if (state._meta) {
    metaStates.push(createMetaState(state))
  }
}

/** Separates states into connected, orphaned, and meta collections */
const categorizeStates = (states: StateConfiguration[]) => {
  const serializedStates: SerializedState[] = []
  const orphanedStates: SerializedState[] = []
  const metaStates: SerializedMetaState[] = []

  for (const state of states) {
    if (isMetaState(state)) {
      processMetaState(state, metaStates)
    } else if (isConnected(state)) {
      processConnectedState(state, serializedStates, metaStates)
    } else {
      processOrphanedState(state, orphanedStates, metaStates)
    }
  }

  return { serializedStates, orphanedStates, metaStates }
}

/** Serializes workflow configuration to YAML string */
export const serialize = (configuration: WorkflowConfiguration): string => {
  const { states = [], assistants, tools, custom_nodes, ...rest } = configuration

  const { serializedStates, orphanedStates, metaStates } = categorizeStates(states)

  const serializedConfiguration: SerializedWorkflowConfig = {
    ...rest,
    ...(assistants && { assistants }),
    ...(tools && { tools }),
    ...(custom_nodes && { custom_nodes }),
    states: serializedStates,
    ...(orphanedStates.length > 0 && { orphaned_states: orphanedStates }),
    ...(metaStates.length > 0 && { meta_states: metaStates }),
  }

  const yamlString = yaml.dump(serializedConfiguration, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    schema: yaml.CORE_SCHEMA,
  })

  return yamlString
    .replaceAll(/\n(assistants|tools|custom_nodes|states|orphaned_states|meta_states):/g, '\n\n$1:')
    .replaceAll("'y':", 'y:')
}
