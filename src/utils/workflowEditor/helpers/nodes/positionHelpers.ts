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
 * Position Management Utilities
 *
 * Functions for managing node positions in workflow configuration.
 * All functions are pure - they do not mutate inputs.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

/**
 * Gets absolute position of a node (converts relative to absolute if node has parent)
 *
 * @param node - The node to get absolute position for
 * @param allNodes - All workflow nodes (needed to find parent)
 * @returns Absolute position coordinates
 */
export const getAbsolutePosition = (
  node: WorkflowNode,
  allNodes: WorkflowNode[]
): { x: number; y: number } => {
  if (!node.parentId) {
    return node.position
  }

  const parent = allNodes.find((n) => n.id === node.parentId)
  if (!parent) {
    return node.position
  }

  return {
    x: node.position.x + parent.position.x,
    y: node.position.y + parent.position.y,
  }
}

/**
 * Checks if two nodes physically overlap in space
 * Automatically converts relative positions to absolute for comparison
 *
 * @param node1 - First node to check
 * @param node2 - Second node to check
 * @param allNodes - All workflow nodes (needed for parent lookups)
 * @returns True if nodes overlap in absolute coordinates
 */
export const hasPositionOverlap = (
  node1: WorkflowNode,
  node2: WorkflowNode,
  allNodes: WorkflowNode[]
): boolean => {
  if (
    !node1.measured?.width ||
    !node1.measured?.height ||
    !node2.measured?.width ||
    !node2.measured?.height
  ) {
    return false
  }

  const node1Pos = getAbsolutePosition(node1, allNodes)
  const node2Pos = getAbsolutePosition(node2, allNodes)

  const node1Right = node1Pos.x + node1.measured.width
  const node1Bottom = node1Pos.y + node1.measured.height
  const node2Right = node2Pos.x + node2.measured.width
  const node2Bottom = node2Pos.y + node2.measured.height

  return !(
    node1Right <= node2Pos.x ||
    node1Pos.x >= node2Right ||
    node1Bottom <= node2Pos.y ||
    node1Pos.y >= node2Bottom
  )
}

/**
 * Checks if any nodes have saved positions in their _meta fields
 */
export const hasSavedPositions = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): boolean => {
  if (!config.states?.length) return false

  return nodes.some((node) => {
    const state = config.states?.find((s) => s.id === node.id)
    return state?._meta?.position !== undefined
  })
}

/**
 * Clears position for a single node in config (pure function)
 * Returns new config with position cleared from _meta
 */
export const clearNodePosition = (
  nodeId: string,
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  const stateIndex = config.states?.findIndex((state) => state.id === nodeId)

  if (stateIndex === undefined || stateIndex === -1 || !config.states) return config

  const newStates = [...config.states]
  const state = newStates[stateIndex]

  if (!state._meta) return config

  newStates[stateIndex] = {
    ...state,
    _meta: {
      ...state._meta,
      position: undefined,
    },
  }

  return {
    ...config,
    states: newStates,
  }
}

/**
 * Clears positions for all nodes in config (pure function)
 * Returns new config with all positions cleared from _meta
 */
export const clearAllNodePositions = (
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): WorkflowConfiguration => {
  let result = config

  for (const node of nodes) {
    result = clearNodePosition(node.id, result)
  }

  return result
}

/**
 * Convert node position from absolute to relative (when attaching to parent)
 * Only updates position - parentId should be set separately
 *
 * @param nodeId - ID of the node to convert
 * @param parentId - ID of the parent node
 * @param nodes - Array of all workflow nodes
 * @returns Updated nodes array
 */
export const translateToRelative = (
  nodeId: string,
  parentId: string,
  nodes: WorkflowNode[]
): WorkflowNode[] => {
  const nodeIndex = nodes.findIndex((n) => n.id === nodeId)
  const parentNode = nodes.find((n) => n.id === parentId)

  if (nodeIndex === -1 || !parentNode) return nodes

  const node = nodes[nodeIndex]
  const updatedNodes = [...nodes]

  updatedNodes[nodeIndex] = {
    ...node,
    position: {
      x: node.position.x - parentNode.position.x,
      y: node.position.y - parentNode.position.y,
    },
  }

  return updatedNodes
}

/**
 * Convert node position from relative to absolute (when detaching from parent)
 * Only updates position - parentId should be removed separately
 *
 * @param nodeId - ID of the node to convert
 * @param oldParentId - ID of the previous parent node
 * @param nodes - Array of all workflow nodes
 * @returns Updated nodes array
 */
export const translateToAbsolute = (
  nodeId: string,
  oldParentId: string,
  nodes: WorkflowNode[]
): WorkflowNode[] => {
  const nodeIndex = nodes.findIndex((n) => n.id === nodeId)
  const oldParentNode = nodes.find((n) => n.id === oldParentId)

  if (nodeIndex === -1 || !oldParentNode) return nodes

  const node = nodes[nodeIndex]
  const updatedNodes = [...nodes]

  updatedNodes[nodeIndex] = {
    ...node,
    position: {
      x: node.position.x + oldParentNode.position.x,
      y: node.position.y + oldParentNode.position.y,
    },
  }

  return updatedNodes
}

/**
 * Sort nodes to ensure parent nodes come before their children
 * Required by ReactFlow for proper parentId handling
 *
 * @param nodes - Array of workflow nodes to sort
 * @returns Sorted array with parents before children
 */
export const sortNodesByParentChild = (nodes: WorkflowNode[]): WorkflowNode[] => {
  const sorted: WorkflowNode[] = []
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const visited = new Set<string>()

  const addNodeAndParent = (node: WorkflowNode) => {
    if (visited.has(node.id)) return

    // If node has a parent, add parent first
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId)
      if (parent && !visited.has(parent.id)) {
        addNodeAndParent(parent)
      }
    }

    visited.add(node.id)
    sorted.push(node)
  }

  for (const node of nodes) {
    addNodeAndParent(node)
  }

  return sorted
}
