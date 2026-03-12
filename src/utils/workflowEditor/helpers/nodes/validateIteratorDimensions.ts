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
 * Iterator Dimension Validator
 *
 * Validates and constrains iterator dimension changes.
 * Handles resizing of iterator nodes and ensures children stay within bounds.
 */

import { NodeChange, NodeDimensionChange, Dimensions } from '@xyflow/react'

import { WorkflowNode } from '@/types/workflowEditor/base'
import { NODE_CHANGE_TYPE } from '@/utils/workflowEditor/constants'

import { constrainIteratorResize } from './constrainIteratorResize'
import { isIteratorNode } from './nodeTypeCheckers'

interface IteratorConstraintResult {
  width: number
  height: number
  x: number
  y: number
  shiftX: number
  shiftY: number
  childrenIds: string[]
}

interface IteratorValidationResult {
  iteratorDimensionChanges: NodeChange[]
  iteratorPositionChanges: NodeChange[]
}

/**
 * Creates dimension change for iterator node
 */
const createIteratorDimensionChange = (
  nodeId: string,
  width: number,
  height: number
): NodeChange => ({
  type: NODE_CHANGE_TYPE.DIMENSIONS,
  id: nodeId,
  dimensions: { width, height },
  resizing: false,
})

/**
 * Creates position change for a node
 */
const createPositionChange = (nodeId: string, x: number, y: number): NodeChange => ({
  type: NODE_CHANGE_TYPE.POSITION,
  id: nodeId,
  position: { x, y },
  dragging: false,
})

/**
 * Checks if iterator position needs adjustment
 */
const needsPositionAdjustment = (
  constrained: IteratorConstraintResult,
  currentPosition: { x: number; y: number }
): boolean => {
  return constrained.x !== currentPosition.x || constrained.y !== currentPosition.y
}

/**
 * Checks if children need to be shifted
 */
const needsChildShift = (constrained: IteratorConstraintResult): boolean => {
  return (constrained.shiftX > 0 || constrained.shiftY > 0) && constrained.childrenIds.length > 0
}

/**
 * Creates position changes for iterator if needed
 */
const createIteratorPositionChanges = (
  node: WorkflowNode,
  constrained: IteratorConstraintResult
): NodeChange[] => {
  if (!needsPositionAdjustment(constrained, node.position)) {
    return []
  }

  return [createPositionChange(node.id, constrained.x, constrained.y)]
}

/**
 * Creates position changes for shifted children
 */
const createChildPositionChanges = (
  constrained: IteratorConstraintResult,
  nodes: WorkflowNode[]
): NodeChange[] => {
  if (!needsChildShift(constrained)) {
    return []
  }

  const changes: NodeChange[] = []

  for (const childId of constrained.childrenIds) {
    const child = nodes.find((n) => n.id === childId)
    if (child) {
      changes.push(
        createPositionChange(
          childId,
          child.position.x + constrained.shiftX,
          child.position.y + constrained.shiftY
        )
      )
    }
  }

  return changes
}

/**
 * Processes a single iterator dimension change
 */
const processIteratorDimensionChange = (
  change: NodeDimensionChange,
  nodes: WorkflowNode[]
): { dimensionChanges: NodeChange[]; positionChanges: NodeChange[] } => {
  const node = nodes.find((n) => n.id === change.id)
  const { width, height } = change.dimensions as Dimensions

  if (!width || !height || !node || !isIteratorNode(node)) {
    return { dimensionChanges: [], positionChanges: [] }
  }

  const constrained = constrainIteratorResize(node, width, height, nodes)

  const dimensionChanges = [
    createIteratorDimensionChange(node.id, constrained.width, constrained.height),
  ]
  const positionChanges = [
    ...createIteratorPositionChanges(node, constrained),
    ...createChildPositionChanges(constrained, nodes),
  ]

  return { dimensionChanges, positionChanges }
}

/**
 * Filters dimension changes that are not currently being resized
 */
const getCompletedDimensionChanges = (changes: NodeChange[]): NodeDimensionChange[] => {
  return changes.filter(
    (change) => change.type === NODE_CHANGE_TYPE.DIMENSIONS && !change.resizing
  ) as NodeDimensionChange[]
}

/**
 * Validates and constrains iterator dimension changes
 *
 * Processes dimension changes for iterator nodes, ensuring:
 * - Iterators maintain minimum size to contain children
 * - Children positions are adjusted when iterator is resized
 * - Position changes are generated when needed
 *
 * @param changes - Array of node changes to process
 * @param nodes - Current workflow nodes
 * @returns Dimension and position changes for iterators and their children
 */
export const validateIteratorDimensions = (
  changes: NodeChange[],
  nodes: WorkflowNode[]
): IteratorValidationResult => {
  const dimensionChanges = getCompletedDimensionChanges(changes)

  const iteratorDimensionChanges: NodeChange[] = []
  const iteratorPositionChanges: NodeChange[] = []

  for (const change of dimensionChanges) {
    const { dimensionChanges, positionChanges } = processIteratorDimensionChange(change, nodes)
    iteratorDimensionChanges.push(...dimensionChanges)
    iteratorPositionChanges.push(...positionChanges)
  }

  return { iteratorDimensionChanges, iteratorPositionChanges }
}
