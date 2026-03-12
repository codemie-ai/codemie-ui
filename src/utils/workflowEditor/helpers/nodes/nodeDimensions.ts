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
 * Node Dimension Helpers
 *
 * Utilities for calculating node dimensions and bounding boxes
 */

import { WorkflowNode } from '@/types/workflowEditor/base'

import { LAYOUT } from '../../build/constants'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../../constants'

/**
 * Gets the width and height for a node
 */
export const getNodeDimensions = (node: WorkflowNode): { width: number; height: number } => {
  const width = node.measured?.width || node.width || DEFAULT_NODE_WIDTH
  const height = node.measured?.height || node.height || DEFAULT_NODE_HEIGHT
  return { width, height }
}

/**
 * Calculates bounding box for iterator child nodes
 * Includes iterator-specific padding (top padding is larger than other sides)
 */
export const calculateIteratorBoundingBox = (
  nodes: WorkflowNode[]
): { x: number; y: number; width: number; height: number } => {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 300, height: 200 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node)
    const { x, y } = node.position

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  return {
    x: minX - LAYOUT.ITERATOR_PADDING,
    y: minY - LAYOUT.ITERATOR_TOP_PADDING,
    width: maxX - minX + LAYOUT.ITERATOR_PADDING * 2,
    height: maxY - minY + LAYOUT.ITERATOR_TOP_PADDING + LAYOUT.ITERATOR_PADDING,
  }
}
