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
 * Node Type Checkers
 *
 * Boolean functions for checking node types
 */

import { WorkflowNode, NodeTypes } from '@/types/workflowEditor/base'
import { CustomNodeConfiguration } from '@/types/workflowEditor/configuration'
import {
  END_NODE_ID,
  START_NODE_ID,
  ITERATOR_ID_PREFIX,
  TRANSFORM_CUSTOM_ACTOR_ID,
} from '@/utils/workflowEditor/constants'

/**
 * A state's `custom_node_id` is the id of an actor in `custom_nodes`, whose own `custom_node_id`
 * is the actor type. Falls back to the state value for actors named after their type.
 */
export const getCustomActorType = (
  actorId: string | undefined,
  customNodes?: CustomNodeConfiguration[]
): string | undefined => customNodes?.find((node) => node.id === actorId)?.custom_node_id ?? actorId

/** The transform actor a state points to, when `actorId` names one in `custom_nodes`. */
export const findTransformActor = (
  actorId: string | undefined,
  customNodes?: CustomNodeConfiguration[]
): CustomNodeConfiguration | undefined =>
  customNodes?.find(
    (node) => node.id === actorId && node.custom_node_id === TRANSFORM_CUSTOM_ACTOR_ID
  )

/**
 * Check if a node is an iterator node (by ID prefix)
 * Used for ID-based checks before node data is available
 */
export const isIteratorNodeById = (node: WorkflowNode): boolean => {
  return node.id.startsWith(ITERATOR_ID_PREFIX)
}

/**
 * Check if a node is an iterator node (by type)
 */
export const isIteratorNode = (node: WorkflowNode): boolean => {
  return node.type === NodeTypes.ITERATOR
}

/**
 * Check if a node is start or end
 */
export const isStartOrEndNode = (node: WorkflowNode): boolean => {
  return node.id === START_NODE_ID || node.id === END_NODE_ID
}
/**
 * Check if a node is a note node
 */
export const isNoteNode = (node: WorkflowNode): boolean => {
  return node.type === NodeTypes.NOTE
}

/**
 * Check if a node is a child node (has a parent)
 */
export const isChildNode = (node: WorkflowNode): boolean => {
  return !!node.parentId
}
