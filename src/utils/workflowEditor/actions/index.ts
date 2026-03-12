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
 * Workflow Manager Actions
 *
 * Centralized facade for all workflow actions.
 * Provides a clean namespace for accessing workflow operations.
 *
 * Usage:
 *   import { actions } from '@/workflowEditor/actions'
 *   actions.states.create(...)
 *   actions.connections.create(...)
 *   actions.config.updateGeneral(...)
 */

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { isValidConnection } from '@/utils/workflowEditor/helpers/connections'

import { updateAdvancedConfig } from './config'
import { createConnectionAction, deleteConnectionAction } from './connections'
import { handleIteratorDropAction } from './nodes'
import {
  createStateAction,
  updateStateConfigurationAction,
  removeStateAction,
  duplicateStateAction,
  makeStateIterableAction,
  makeStateNonIterableAction,
  saveNodeMetadata,
  saveStatesToMetaState,
} from './states'

/**
 * Unified actions namespace
 * Groups related actions by domain
 */
export const actions = {
  /**
   * State actions - operations on workflow nodes/states
   */
  states: {
    create: createStateAction,
    update: updateStateConfigurationAction,
    remove: removeStateAction,
    duplicate: duplicateStateAction,
    makeIterable: makeStateIterableAction,
    makeNonIterable: makeStateNonIterableAction,
    saveMetadata: saveNodeMetadata,
    saveToMeta: saveStatesToMetaState,
  },

  /**
   * Connection actions - operations on edges/connections
   */
  connections: {
    create: createConnectionAction,
    delete: deleteConnectionAction,
    validate: (connection: any, nodes: any[], config: WorkflowConfiguration, showError?: boolean) =>
      isValidConnection(connection, nodes, config, showError),
  },

  /**
   * Configuration actions - workflow-level settings
   */
  config: { updateAdvancedConfig },

  /**
   * Node actions - node positioning and interactions
   */
  nodes: {
    handleIteratorDrop: handleIteratorDropAction,
  },
} as const

// Export individual action groups for flexibility
export const stateActions = actions.states
export const connectionActions = actions.connections
export const configActions = actions.config
export const nodeActions = actions.nodes

/**
 * Standard action result containing updated configuration
 */
export interface ActionResult {
  config: WorkflowConfiguration
}

// Re-export types
export type { IteratorParentChange } from './nodes'
export type { ConfigurationUpdate } from './states'
