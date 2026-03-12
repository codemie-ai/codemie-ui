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
 * State Actions Utilities
 *
 * Shared utility functions for state actions.
 * All functions are pure - they do not mutate inputs.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

/**
 * Saves a single node's metadata to config._meta (pure function)
 *
 * @param node - Node to save
 * @param config - Current configuration (with _meta fields)
 * @returns New config with the node's _meta saved
 */
export const saveNodeMetadata = (
  node: WorkflowNode,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const newStates = [...(config.states ?? [])]
  const stateIndex = config.states?.findIndex((state) => state.id === node.id) ?? -1

  if (stateIndex === -1) {
    newStates.push({
      id: node.id,
      _meta: {
        type: node.type || '',
        position: node.position,
        measured: node.measured,
        selected: node.selected,
      },
    })
  } else {
    const state = newStates[stateIndex]

    newStates[stateIndex] = {
      ...state,
      _meta: {
        type: node.type || '',
        ...state._meta,
        position: node.position,
        measured: node.measured,
        selected: node.selected,
      },
    }
  }

  return {
    ...config,
    states: newStates,
  }
}

/**
 * Saves multiple nodes' metadata to config._meta (pure function)
 *
 * @param nodes - Nodes to save
 * @param config - Current configuration (with _meta fields)
 * @returns New config with all nodes' _meta saved
 */
export const saveStatesToMetaState = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  let result = config

  for (const node of nodes) {
    result = saveNodeMetadata(node, result)
  }

  return result
}
