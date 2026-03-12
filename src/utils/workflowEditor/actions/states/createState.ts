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
 * Create State Action
 *
 * Handles creating new states in the workflow.
 * Builds complete state configuration including next field for decision nodes.
 */

import { NodeTypes, NodeType } from '@/types/workflowEditor/base'
import {
  WorkflowConfiguration,
  StateConfiguration,
  NextState,
} from '@/types/workflowEditor/configuration'
import type { ActionResult } from '@/utils/workflowEditor/actions'
import {
  ITERATOR_NODE_DEFAULT_WIDTH,
  ITERATOR_NODE_DEFAULT_HEIGHT,
} from '@/utils/workflowEditor/constants'

/** Generates incremental state ID based on existing nodes */
const generateStateID = (nodeType: NodeType, existingStates: StateConfiguration[]) => {
  const prefix = `${nodeType}_`
  const existingIDs = existingStates.map((state) => state.id).filter((id) => id.startsWith(prefix))

  if (existingIDs.length === 0) {
    return `${prefix}1`
  }

  const numbers = existingIDs
    .map((id) => {
      const suffix = id.replace(prefix, '')
      return Number.parseInt(suffix, 10)
    })
    .filter((num) => !Number.isNaN(num))

  const maxNumber = Math.max(...numbers, 0)
  return `${prefix}${maxNumber + 1}`
}

const CONDITIONAL_NEXT: NextState = {
  condition: {
    expression: '',
    then: '', // nosonar
    otherwise: '',
  },
}

const SWITCH_NEXT: NextState = {
  switch: {
    cases: [
      {
        condition: 'x == true',
        state_id: '',
      },
    ],
    default: '',
  },
}

const buildState = (
  nodeType: NodeType,
  position: { x: number; y: number },
  existingStates: StateConfiguration[]
) => {
  const id = generateStateID(nodeType, existingStates)

  if (nodeType === NodeTypes.CONDITIONAL) {
    return {
      id,
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
        data: { next: CONDITIONAL_NEXT },
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.SWITCH) {
    return {
      id,
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
        data: { next: SWITCH_NEXT },
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.NOTE) {
    return {
      id,
      next: {},
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
        data: { note: '' },
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.ITERATOR) {
    return {
      id,
      next: {},
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
        data: {
          next: {
            iter_key: 'item',
          },
        },
        measured: {
          width: ITERATOR_NODE_DEFAULT_WIDTH,
          height: ITERATOR_NODE_DEFAULT_HEIGHT,
        },
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.ASSISTANT) {
    return {
      id,
      assistant_id: '',
      next: {},
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.TOOL) {
    return {
      id,
      tool_id: '',
      next: {},
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
      },
    } as StateConfiguration
  }

  if (nodeType === NodeTypes.CUSTOM) {
    return {
      id,
      custom_node_id: '',
      next: {},
      _meta: {
        position,
        type: nodeType,
        is_connected: false,
        selected: true,
      },
    } as StateConfiguration
  }

  return {
    id,
    next: {},
    _meta: {
      position,
      type: nodeType,
      is_connected: false,
      selected: true,
    },
  } as StateConfiguration
}

/**
 * Creates a new state in the workflow
 * Builds complete state configuration including next field for decision nodes
 *
 * @param node - The node to create state from
 * @param config - Current workflow configuration
 * @returns Updated config
 */
export const createStateAction = (
  nodeType: NodeType,
  position: { x: number; y: number },
  config: WorkflowConfiguration
): ActionResult => {
  const newStates = [...config.states]
  const newState = buildState(nodeType, position, config.states)
  newStates.push(newState)

  return { config: { ...config, states: newStates } }
}
