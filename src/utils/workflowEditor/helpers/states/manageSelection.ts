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
 * Selection Management Utilities
 *
 * Functions for managing node selection state in workflow.
 * All functions are pure - they do not mutate inputs.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

/**
 * Finds the currently selected node based on _meta.selected
 */
export const findSelectedNode = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): WorkflowNode | null => {
  const selectedState = config.states?.find((state) => state._meta?.selected === true)

  if (selectedState) {
    return nodes.find((node) => node.id === selectedState.id) ?? null
  }

  return null
}

/**
 * Updates selection to select only one node (pure function)
 * Deselects all other nodes in both nodes array and config._meta
 */
export const selectNode = (
  nodeId: string,
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): { nodes: WorkflowNode[]; config: WorkflowConfiguration } => {
  // Update nodes - deselect all except the target
  const updatedNodes = nodes.map((n) => ({
    ...n,
    selected: n.id === nodeId,
  }))

  // Update config states - deselect all except the target
  const updatedStates = config.states?.map((state) => ({
    ...state,
    _meta: state._meta
      ? {
          ...state._meta,
          selected: state.id === nodeId,
        }
      : undefined,
  }))

  return {
    nodes: updatedNodes,
    config: {
      ...config,
      states: updatedStates,
    },
  }
}

/**
 * Clears selection from all nodes (pure function)
 */
export const clearSelection = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): { nodes: WorkflowNode[]; config: WorkflowConfiguration } => {
  const updatedNodes = nodes.map((n) => ({
    ...n,
    selected: false,
  }))

  const updatedStates = config.states?.map((state) => ({
    ...state,
    _meta: state._meta
      ? {
          ...state._meta,
          selected: false,
        }
      : undefined,
  }))

  return {
    nodes: updatedNodes,
    config: {
      ...config,
      states: updatedStates,
    },
  }
}
