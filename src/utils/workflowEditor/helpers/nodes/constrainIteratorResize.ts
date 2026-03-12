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
 * Iterator Resize Validator
 *
 * Validates and constrains iterator node resizing to ensure
 * iterator nodes cannot be resized smaller than their children.
 */

import { WorkflowNode } from '@/types/workflowEditor/base'
import { LAYOUT } from '@/utils/workflowEditor/build/constants'
import {
  ITERATOR_NODE_DEFAULT_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
} from '@/utils/workflowEditor/constants'

const PADDING = LAYOUT.ITERATOR_PADDING

/**
 * Calculates the minimum size an iterator needs to contain all its children
 */
export const getMinimumIteratorSize = (
  iteratorNode: WorkflowNode,
  allNodes: WorkflowNode[]
): { width: number; height: number } => {
  const children = allNodes.filter((n) => n.parentId === iteratorNode.id)

  if (children.length === 0) {
    return { width: 200, height: 150 }
  }

  let maxX = -Infinity
  let maxY = -Infinity

  for (const child of children) {
    const childRight = child.position.x + (child.width || ITERATOR_NODE_DEFAULT_WIDTH)
    const childBottom = child.position.y + (child.height || ITERATOR_NODE_DEFAULT_HEIGHT)

    maxX = Math.max(maxX, childRight)
    maxY = Math.max(maxY, childBottom)
  }

  // Iterator needs to extend from (0,0) to rightmost/bottommost child + padding
  const width = maxX + PADDING
  const height = maxY + PADDING

  return { width, height }
}

/**
 * Validates and constrains iterator node dimensions
 * Returns constrained dimensions and position adjustments
 * Calculates shift needed for left/top expansion without mutating nodes
 */
export const constrainIteratorResize = (
  iteratorNode: WorkflowNode,
  requestedWidth: number,
  requestedHeight: number,
  allNodes: WorkflowNode[]
): {
  width: number
  height: number
  x: number
  y: number
  shiftX: number
  shiftY: number
  childrenIds: string[]
} => {
  const children = allNodes.filter((n) => n.parentId === iteratorNode.id)

  if (children.length === 0) {
    const minSize = getMinimumIteratorSize(iteratorNode, allNodes)
    return {
      width: Math.max(requestedWidth, minSize.width),
      height: Math.max(requestedHeight, minSize.height),
      x: iteratorNode.position.x,
      y: iteratorNode.position.y,
      shiftX: 0,
      shiftY: 0,
      childrenIds: [],
    }
  }

  // Step 1: Calculate current bounding box of all children
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const child of children) {
    const childRight = child.position.x + (child.width || ITERATOR_NODE_DEFAULT_WIDTH)
    const childBottom = child.position.y + (child.height || ITERATOR_NODE_DEFAULT_HEIGHT)

    minX = Math.min(minX, child.position.x)
    minY = Math.min(minY, child.position.y)
    maxX = Math.max(maxX, childRight)
    maxY = Math.max(maxY, childBottom)
  }

  // Step 2: Calculate shift needed to maintain PADDING on left/top
  const shiftX = Math.max(0, PADDING - minX)
  const shiftY = Math.max(0, PADDING - minY)

  // Step 3: Calculate new iterator position (moved left/up by shift)
  const newIteratorX = iteratorNode.position.x - shiftX
  const newIteratorY = iteratorNode.position.y - shiftY

  // Step 4: Calculate children bounds AFTER they're shifted right/down
  const shiftedMaxX = maxX + shiftX
  const shiftedMaxY = maxY + shiftY

  // Step 5: Calculate required dimensions to contain shifted children with padding
  // Iterator should span from (0,0) to (width, height)
  // Children span from shiftedMinX to shiftedMaxX
  // We need PADDING on right side as well
  const requiredWidth = shiftedMaxX + PADDING
  const requiredHeight = shiftedMaxY + PADDING

  return {
    width: Math.max(requestedWidth, requiredWidth),
    height: Math.max(requestedHeight, requiredHeight),
    x: newIteratorX,
    y: newIteratorY,
    shiftX,
    shiftY,
    childrenIds: children.map((c) => c.id),
  }
}
