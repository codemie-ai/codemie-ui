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
 * Backwards Connection Detection
 *
 * Utilities for detecting and marking backwards connections (loops) in the workflow graph.
 * A backwards connection occurs when the target node is positioned to the left of the source node,
 * indicating a loop back in the workflow.
 */

import { WorkflowNode, WorkflowEdge } from '@/types/workflowEditor/base'
import { EDGE_TYPES } from '@/utils/workflowEditor/constants'

/**
 * Gets the absolute position of a node, accounting for parent iterator offset
 */
const getAbsolutePosition = (
  node: WorkflowNode,
  nodes: WorkflowNode[]
): { x: number; y: number } => {
  if (!node.parentId) {
    return node.position
  }

  const parent = nodes.find((n) => n.id === node.parentId)
  if (!parent) {
    return node.position
  }

  return {
    x: parent.position.x + node.position.x,
    y: parent.position.y + node.position.y,
  }
}

/**
 * Detects if a connection/edge is a backwards connection (creates a loop)
 *
 * A backwards connection occurs when:
 * 1. Target node appears before source node in the workflow order
 * 2. Or target node's position is to the left of source node's position
 *
 * Note: For nodes inside iterators (with parentId), converts to absolute position first
 *
 * @param edge - Edge to check
 * @param nodes - All workflow nodes
 * @returns true if edge is backwards
 */
export const isBackwardsConnection = (edge: WorkflowEdge, nodes: WorkflowNode[]): boolean => {
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  if (!sourceNode || !targetNode) return false

  // Get absolute positions (account for iterator parent offset)
  const sourcePos = getAbsolutePosition(sourceNode, nodes)
  const targetPos = getAbsolutePosition(targetNode, nodes)

  // Check if target is to the left of source (backwards in X axis)
  return targetPos.x < sourcePos.x
}

/**
 * Marks backwards connections in an array of edges
 * Updates edge type to 'backwards' for edges that go backwards
 *
 * @param edges - Array of edges to process
 * @param nodes - All workflow nodes
 * @returns Updated edges with backwards type set
 */
export const markBackwardsConnections = (
  edges: WorkflowEdge[],
  nodes: WorkflowNode[]
): WorkflowEdge[] => {
  return edges.map((edge) => {
    const type = isBackwardsConnection(edge, nodes) ? EDGE_TYPES.BACKWARDS : EDGE_TYPES.DEFAULT

    return { ...edge, type }
  })
}
