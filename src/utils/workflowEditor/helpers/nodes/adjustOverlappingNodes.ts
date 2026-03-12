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
 * Node Overlap Adjustment
 *
 * Prevents nodes from overlapping with each other.
 * After a node is moved, checks for overlaps and pushes overlapping nodes out of the way.
 * Special handling for iterators: their children are allowed to overlap.
 */

import { NodeChange, applyNodeChanges } from '@xyflow/react'

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import {
  NODE_CHANGE_TYPE,
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  ITERATOR_NODE_DEFAULT_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
  CONDITIONAL_NODE_DEFAULT_WIDTH,
  CONDITIONAL_NODE_DEFAULT_HEIGHT,
  SWITCH_NODE_DEFAULT_WIDTH,
  SWITCH_NODE_DEFAULT_HEIGHT,
  NOTE_NODE_DEFAULT_WIDTH,
  NOTE_NODE_DEFAULT_HEIGHT,
} from '@/utils/workflowEditor/constants'

import { isIteratorNodeById } from './nodeTypeCheckers'
import { hasPositionOverlap } from './positionHelpers'

const NODE_OVERLAP_GAP = 20 // Gap between nodes when pushed (px)
const MAX_OVERLAP_ITERATIONS = 50 // Max iterations to prevent infinite loops

/**
 * Gets default dimensions for a node based on its type
 */
const getDefaultDimensions = (node: WorkflowNode): { width: number; height: number } => {
  if (isIteratorNodeById(node)) {
    return { width: ITERATOR_NODE_DEFAULT_WIDTH, height: ITERATOR_NODE_DEFAULT_HEIGHT }
  }

  switch (node.type) {
    case NodeTypes.CONDITIONAL:
      return { width: CONDITIONAL_NODE_DEFAULT_WIDTH, height: CONDITIONAL_NODE_DEFAULT_HEIGHT }
    case NodeTypes.SWITCH:
      return { width: SWITCH_NODE_DEFAULT_WIDTH, height: SWITCH_NODE_DEFAULT_HEIGHT }
    case NodeTypes.NOTE:
      return { width: NOTE_NODE_DEFAULT_WIDTH, height: NOTE_NODE_DEFAULT_HEIGHT }
    default:
      return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT }
  }
}

/**
 * Ensures all nodes have dimensions (assigns defaults if missing)
 */
const ensureNodeDimensions = (nodes: WorkflowNode[]): WorkflowNode[] => {
  return nodes.map((node) => {
    if (!node.measured) {
      return { ...node, measured: getDefaultDimensions(node) }
    }
    return node
  })
}

/**
 * Checks if two nodes have parent-child relationship (allowed to overlap)
 */
const isParentChild = (node1: WorkflowNode, node2: WorkflowNode): boolean => {
  return (
    (isIteratorNodeById(node1) && node2.parentId === node1.id) ||
    (isIteratorNodeById(node2) && node1.parentId === node2.id)
  )
}

/**
 * Calculates position to push node away vertically (up or down based on proximity)
 */
const calculatePushPosition = (
  causingNode: WorkflowNode,
  nodeToPush: WorkflowNode
): { x: number; y: number } => {
  if (!causingNode.measured?.height) return nodeToPush.position

  const causingNodeTop = causingNode.position.y
  const causingNodeBottom = causingNode.position.y + causingNode.measured.height
  const nodeCenter = nodeToPush.position.y + (nodeToPush.measured?.height || 0) / 2

  const distanceToTop = Math.abs(nodeCenter - causingNodeTop)
  const distanceToBottom = Math.abs(nodeCenter - causingNodeBottom)

  // Push up or down based on which is closer
  const pushY =
    distanceToTop < distanceToBottom
      ? causingNodeTop - (nodeToPush.measured?.height || 0) - NODE_OVERLAP_GAP
      : causingNodeBottom + NODE_OVERLAP_GAP

  return { x: nodeToPush.position.x, y: pushY }
}

/**
 * Calculates position to push node DOWN only (for new node creation)
 * Unlike calculatePushPosition, this never pushes up to prevent nodes going off-screen
 */
const calculatePushPositionDown = (
  causingNode: WorkflowNode,
  nodeToPush: WorkflowNode
): { x: number; y: number } => {
  if (!causingNode.measured?.height) return nodeToPush.position

  const causingNodeBottom = causingNode.position.y + causingNode.measured.height
  const pushY = causingNodeBottom + NODE_OVERLAP_GAP

  return { x: nodeToPush.position.x, y: pushY }
}

/**
 * Tries to push two nodes apart if they overlap (respects parent-child relationships)
 * Returns true if push was performed
 */
const tryPushApart = (
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  workingNodes: WorkflowNode[],
  pushChanges: Map<string, { x: number; y: number }>,
  newNodeId?: string
): boolean => {
  // Never push the newly created node itself
  if (newNodeId && targetNode.id === newNodeId) return false

  if (isParentChild(sourceNode, targetNode)) return false
  if (!hasPositionOverlap(sourceNode, targetNode, workingNodes)) return false

  // If adjusting for new node creation, always push DOWN; otherwise use bidirectional
  const pushPosition = newNodeId
    ? calculatePushPositionDown(sourceNode, targetNode)
    : calculatePushPosition(sourceNode, targetNode)

  pushChanges.set(targetNode.id, pushPosition)

  // Update working array for cascade detection
  const nodeIndex = workingNodes.findIndex((n) => n.id === targetNode.id)
  if (nodeIndex !== -1) {
    workingNodes[nodeIndex] = { ...workingNodes[nodeIndex], position: pushPosition }
  }

  return true
}

/**
 * Checks one node against all others and returns IDs of nodes that were pushed
 */
const findAndPushOverlaps = (
  checkNodeId: string,
  workingNodes: WorkflowNode[],
  pushChanges: Map<string, { x: number; y: number }>,
  newNodeId?: string
): Set<string> => {
  const pushedNodeIds = new Set<string>()
  const checkNode = workingNodes.find((n) => n.id === checkNodeId)
  if (!checkNode) return pushedNodeIds

  for (const otherNode of workingNodes) {
    if (
      otherNode.id !== checkNodeId &&
      tryPushApart(checkNode, otherNode, workingNodes, pushChanges, newNodeId)
    ) {
      pushedNodeIds.add(otherNode.id)
    }
  }

  return pushedNodeIds
}

/**
 * Converts push changes map to NodeChange array
 */
const toPushChanges = (pushMap: Map<string, { x: number; y: number }>): NodeChange[] => {
  return Array.from(pushMap.entries()).map(([nodeId, position]) => ({
    type: NODE_CHANGE_TYPE.POSITION,
    id: nodeId,
    position,
    dragging: false,
  }))
}

/**
 * Adjusts positions to prevent node overlaps
 *
 * Algorithm:
 * 1. Filter relevant changes (position/dimension changes that are finalized)
 * 2. Apply changes to working copy of nodes
 * 3. Iteratively check changed nodes and push overlapping nodes away
 * 4. Cascade: if a node was pushed, check it against others (until no more pushes or max iterations)
 * 5. Return all push position changes
 *
 * @param changes - Node changes to process
 * @param nodes - Current workflow nodes (before changes applied)
 * @param newNodeId - Optional ID of newly created node (keeps it fixed, pushes others down only)
 * @returns Array of additional position changes to push overlapping nodes away
 */
export const adjustOverlappingNodes = (
  changes: NodeChange[],
  nodes: WorkflowNode[],
  newNodeId?: string
): NodeChange[] => {
  const relevantChanges = changes.filter(
    (c) =>
      (c.type === NODE_CHANGE_TYPE.POSITION && !c.dragging) ||
      (c.type === NODE_CHANGE_TYPE.DIMENSIONS && !c.resizing)
  )

  if (relevantChanges.length === 0) return []

  // Ensure all nodes have dimensions before overlap detection
  const nodesWithDimensions = ensureNodeDimensions(nodes)

  const workingNodes = applyNodeChanges(relevantChanges, [...nodesWithDimensions])
  const changedNodeIds = relevantChanges.map((c) => (c as { id: string }).id)
  const pushChanges = new Map<string, { x: number; y: number }>()

  let nodesToCheck = new Set(changedNodeIds)
  let iteration = 0

  while (nodesToCheck.size > 0 && iteration < MAX_OVERLAP_ITERATIONS) {
    iteration += 1
    const pushedThisIteration = new Set<string>()

    for (const nodeId of nodesToCheck) {
      const pushed = findAndPushOverlaps(nodeId, workingNodes, pushChanges, newNodeId)
      for (const id of pushed) {
        pushedThisIteration.add(id)
      }
    }

    nodesToCheck = pushedThisIteration
  }

  if (iteration >= MAX_OVERLAP_ITERATIONS) {
    console.warn('adjustOverlappingNodes: max iterations reached')
  }

  return toPushChanges(pushChanges)
}
