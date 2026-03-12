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
 * Iterator Drop Handler
 *
 * Handles node drop operations onto iterator nodes.
 * Only execution nodes (Assistant, Tool, Custom) can be dropped into iterators.
 * Invalid drops are reverted to their original positions.
 */

import { NodePositionChange } from '@xyflow/react'

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import toaster from '@/utils/toaster'
import { isIteratorNode } from '@/utils/workflowEditor/helpers/nodes'
import { findParents, getStateNext } from '@/utils/workflowEditor/helpers/states'

const ERROR_MESSAGE =
  'Only execution nodes (Assistant, Tool, Custom, Transform) can be dropped into an Iterator'
const ERROR_MULTIPLE_PARENTS = 'Cannot add node with multiple parents to an iterator'
const ERROR_NO_PARENTS = 'Cannot add node to iterator: node must have a parent connection first'
const ERROR_HAS_SIBLINGS =
  'Cannot add a node with siblings to an iterator. Parent node has multiple children.'

export interface IteratorParentChange {
  nodeId: string
  oldIteratorId: string | null
  newIteratorId: string | null
}

export interface IteratorDropResult {
  changes: NodePositionChange[]
  parentChanges: IteratorParentChange[]
}

const isNodeIterable = (node: WorkflowNode): boolean => {
  return (
    node.type === NodeTypes.ASSISTANT ||
    node.type === NodeTypes.TOOL ||
    node.type === NodeTypes.CUSTOM ||
    node.type === NodeTypes.TRANSFORM
  )
}

/* Get iterator IDs before and after the drop */
const getIteratorIds = (
  node: WorkflowNode,
  state: any,
  getIntersectingNodes: (node: WorkflowNode) => WorkflowNode[]
) => {
  const iterMetaStateID = state.next?.meta_iter_state_id

  const intersectingNodes = getIntersectingNodes(node)
  const currentIterator = intersectingNodes.find(isIteratorNode) ?? null

  return {
    previousIteratorId: iterMetaStateID ?? null,
    currentIteratorId: currentIterator?.id ?? null,
  }
}

/**
 * Revert node position to original and return false
 */
const revertPosition = (change: NodePositionChange, state: any): boolean => {
  if (state._meta?.position) {
    change.position = state._meta.position
  }
  return false
}

/**
 * Validate drop and revert if invalid
 */
const validateDrop = (
  node: WorkflowNode,
  change: NodePositionChange,
  state: any,
  currentIteratorId: string | null,
  config: WorkflowConfiguration
): boolean => {
  if (!currentIteratorId) return true

  // Check if node is iterable type
  if (!isNodeIterable(node)) {
    toaster.error(ERROR_MESSAGE)
    return revertPosition(change, state)
  }

  const parents = findParents(node.id, config.states)
  if (parents.length > 1) {
    toaster.error(ERROR_MULTIPLE_PARENTS)
    return revertPosition(change, state)
  }

  // Check if node has no parents
  if (parents.length === 0) {
    toaster.error(ERROR_NO_PARENTS)
    return revertPosition(change, state)
  }

  const parentId = parents[0]
  const parentState = config.states.find((s) => s.id === parentId)

  if (parentState) {
    const parentNext = getStateNext(parentState)
    if (parentNext?.state_ids) {
      toaster.error(ERROR_HAS_SIBLINGS)
      return revertPosition(change, state)
    }
  }

  return true
}

/**
 * Process a single position change and track parent changes
 * Mutates change.position if drop is invalid
 */
const processChange = (
  change: NodePositionChange,
  nodes: WorkflowNode[],
  config: WorkflowConfiguration,
  getIntersectingNodes: (node: WorkflowNode) => WorkflowNode[],
  parentChanges: IteratorParentChange[]
): void => {
  const node = nodes.find((n) => n.id === change.id)
  if (!node) return

  const state = config.states.find((s) => s.id === node.id)
  if (!state) return

  const { previousIteratorId, currentIteratorId } = getIteratorIds(
    node,
    state,
    getIntersectingNodes
  )

  if (previousIteratorId === currentIteratorId) return

  const isValid = validateDrop(node, change, state, currentIteratorId, config)
  if (!isValid) return

  parentChanges.push({
    nodeId: node.id,
    oldIteratorId: previousIteratorId,
    newIteratorId: currentIteratorId,
  })
}

/**
 * Handles and validates position changes for nodes dropped onto/out of iterators
 *
 * @param changes - Position changes to process
 * @param nodes - Current workflow nodes (BEFORE position changes applied)
 * @param config - Current workflow configuration (to get stored positions)
 * @param getIntersectingNodes - Function to get nodes intersecting with a given node
 * @returns Modified changes array with invalid drops reverted to original positions, and parent change metadata
 */
export const handleIteratorDropAction = (
  changes: NodePositionChange[],
  nodes: WorkflowNode[],
  config: WorkflowConfiguration,
  getIntersectingNodes: (node: WorkflowNode) => WorkflowNode[]
): IteratorDropResult => {
  const parentChanges: IteratorParentChange[] = []

  for (const change of changes) {
    processChange(change, nodes, config, getIntersectingNodes, parentChanges)
  }

  return {
    changes,
    parentChanges,
  }
}
