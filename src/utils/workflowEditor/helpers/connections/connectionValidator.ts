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
 * Connection Validation Module
 *
 * Validates connections between workflow nodes to ensure proper graph structure.
 * Enforces rules about which node types can connect to which other node types.
 */

import { Connection } from '@xyflow/react'

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import toaster from '@/utils/toaster'
import { findDirectParents } from '@/utils/workflowEditor/helpers/states'

/* Error messages */
const ERROR_MSGS = {
  SELF_LOOP: 'Cannot connect a node to itself',
  UNKNOWN_NODE_TYPE: 'Invalid connection: unknown node type',
  ITERATOR_MULTIPLE_PARENTS:
    'Cannot connect to a node that is in an iterator and already has a parent',
  CIRCULAR_CONNECTION:
    'Cannot create circular connection: target node already connects back to source',
  ITER_KEY_WITH_MULTIPLE_CHILDREN:
    'Cannot create multiple connections from a node with iterable children. Remove the node from iterator first.',
  NO_OUTGOING_CONNECTIONS: (displayName: string) =>
    `${displayName} node cannot have outgoing connections`,
  NOT_CONNECTION_TARGET: (displayName: string) =>
    `${displayName} node cannot be a connection target`,
  ONLY_EXECUTION_NODES: (displayName: string) =>
    `${displayName} nodes can only connect to execution nodes`,
} as const

/* Shows connection error messages */
const showConnectionError = (message: string): void => {
  toaster.error(message)
}

/* Helper to handle validation errors */
const handleValidationError = (errorMessage: string | null, showError: boolean): boolean => {
  if (errorMessage) {
    if (showError) showConnectionError(errorMessage)
    return false
  }
  return true
}

/* Get node type from node ID in the nodes array */
const getNodeType = (nodeId: string | null, nodes: WorkflowNode[]): string | null => {
  if (!nodeId) return null
  const node = nodes.find((n) => n.id === nodeId)
  return node?.type ?? null
}

/* Execution nodes - nodes that perform actual work */
const EXECUTION_NODES: readonly string[] = [
  NodeTypes.ASSISTANT,
  NodeTypes.CUSTOM,
  NodeTypes.TOOL,
  NodeTypes.TRANSFORM,
]

/* Node validation configuration */
interface NodeValidationRule {
  displayName: string
  canBeSource: boolean
  canBeTarget: boolean
  validTargets?: readonly string[]
}

const NODE_VALIDATION_RULES: Record<string, NodeValidationRule> = {
  [NodeTypes.START]: {
    displayName: 'Start',
    canBeSource: true,
    canBeTarget: false,
    validTargets: EXECUTION_NODES,
  },
  [NodeTypes.END]: {
    displayName: 'End',
    canBeSource: false,
    canBeTarget: true,
  },
  [NodeTypes.CONDITIONAL]: {
    displayName: 'Conditional',
    canBeSource: true,
    canBeTarget: true,
    validTargets: [...EXECUTION_NODES, NodeTypes.END],
  },
  [NodeTypes.SWITCH]: {
    displayName: 'Switch',
    canBeSource: true,
    canBeTarget: true,
    validTargets: [...EXECUTION_NODES, NodeTypes.END],
  },
  [NodeTypes.ASSISTANT]: {
    displayName: 'Assistant',
    canBeSource: true,
    canBeTarget: true,
  },
  [NodeTypes.TOOL]: {
    displayName: 'Tool',
    canBeSource: true,
    canBeTarget: true,
  },
  [NodeTypes.CUSTOM]: {
    displayName: 'Custom',
    canBeSource: true,
    canBeTarget: true,
  },
  [NodeTypes.TRANSFORM]: {
    displayName: 'Transform',
    canBeSource: true,
    canBeTarget: true,
  },
}

/* Check connection based on node validation rules */
const checkConnectionRules = (sourceType: string, targetType: string): string | null => {
  const sourceRule = NODE_VALIDATION_RULES[sourceType]
  const targetRule = NODE_VALIDATION_RULES[targetType]

  if (!sourceRule || !targetRule) return ERROR_MSGS.UNKNOWN_NODE_TYPE

  if (!sourceRule.canBeSource) return ERROR_MSGS.NO_OUTGOING_CONNECTIONS(sourceRule.displayName)

  if (!targetRule.canBeTarget) return ERROR_MSGS.NOT_CONNECTION_TARGET(targetRule.displayName)

  if (sourceRule.validTargets && !sourceRule.validTargets.includes(targetType))
    return ERROR_MSGS.ONLY_EXECUTION_NODES(sourceRule.displayName)

  return null
}

/* Check if node is in an iterator */
const isNodeInIterator = (node: WorkflowNode | undefined, state: any): boolean => {
  return Boolean(node?.parentId || state?.next?.meta_iter_state_id)
}

/* Check for circular connections by recursively checking if target's parents lead back to source */
const checkCircularConnection = (
  sourceID: string,
  targetID: string,
  config: WorkflowConfiguration
): string | null => {
  const visited = new Set<string>()

  const checkNode = (currentNodeID: string, targetID: string): boolean => {
    if (visited.has(currentNodeID)) return false

    visited.add(currentNodeID)

    const parents = findDirectParents(currentNodeID, config.states)
    if (parents.includes(targetID)) return true

    for (const parentId of parents) {
      if (checkNode(parentId, targetID)) return true
    }

    return false
  }

  return checkNode(sourceID, targetID) ? ERROR_MSGS.CIRCULAR_CONNECTION : null
}

/* Check that source with iter_key cannot have multiple children */
const checkSourceIterKeyConstraint = (
  sourceId: string,
  config: WorkflowConfiguration
): string | null => {
  const sourceState = config.states?.find((s) => s.id === sourceId)

  if (!sourceState?.next?.iter_key) {
    return null
  }

  // Source has iter_key - check if this would create multiple children
  const hasExistingChild = sourceState.next.state_id && sourceState.next.state_id !== ''
  const hasMultipleChildren = sourceState.next.state_ids && sourceState.next.state_ids.length > 0

  if (hasExistingChild || hasMultipleChildren) {
    return ERROR_MSGS.ITER_KEY_WITH_MULTIPLE_CHILDREN
  }

  return null
}

/* Check that target in iterator cannot have multiple parents */
const checkTargetIteratorConstraint = (
  targetId: string,
  nodes: WorkflowNode[],
  config: WorkflowConfiguration
): string | null => {
  const targetNode = nodes.find((n) => n.id === targetId)
  const targetState = config.states?.find((s) => s.id === targetId)

  // If target is in an iterator (has parentId or meta_iter_state_id)
  if (!isNodeInIterator(targetNode, targetState)) {
    return null
  }

  // Check if target already has parents
  const existingParents = findDirectParents(targetId, config.states ?? [])

  if (existingParents.length > 0) {
    return ERROR_MSGS.ITERATOR_MULTIPLE_PARENTS
  }

  return null
}

/**
 * Validates if a connection is allowed based on node types
 * @param connection - The connection to validate (from ReactFlow's onConnect)
 * @param nodes - Array of workflow nodes
 * @param config - Workflow configuration (for advanced validation like iterator checks)
 * @param showError - Whether to show error toasts (default: false for visual feedback only)
 * @returns true if connection is valid, false otherwise
 */
export const isValidConnection = (
  connection: Connection,
  nodes: WorkflowNode[],
  config: WorkflowConfiguration,
  showError: boolean = false
): boolean => {
  const { source, target } = connection

  // Basic validation - prevent self-loops
  if (source === target) {
    if (showError) showConnectionError(ERROR_MSGS.SELF_LOOP)
    return false
  }

  // Node type validation
  const sourceType = getNodeType(source, nodes)
  const targetType = getNodeType(target, nodes)

  if (!sourceType || !targetType) {
    return false
  }

  // Connection rules validation
  const rulesError = checkConnectionRules(sourceType, targetType)
  if (!handleValidationError(rulesError, showError)) {
    return false
  }

  const circularError = checkCircularConnection(source, target, config)
  if (!handleValidationError(circularError, showError)) {
    return false
  }

  // Check source: node with iter_key cannot have multiple children
  const sourceIterKeyError = checkSourceIterKeyConstraint(source, config)
  if (!handleValidationError(sourceIterKeyError, showError)) {
    return false
  }

  // Check target: node in iterator cannot have multiple parents
  const targetIteratorError = checkTargetIteratorConstraint(target, nodes, config)
  if (!handleValidationError(targetIteratorError, showError)) {
    return false
  }

  return true
}
