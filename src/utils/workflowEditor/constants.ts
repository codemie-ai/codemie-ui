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
 * Workflow Node Editor Constants
 *
 * Shared constants used across the workflow node editor.
 */

/* Node IDs and prefixes */
export const START_NODE_ID = 'start'
export const END_NODE_ID = 'end'

export const ITERATOR_ID_PREFIX = 'iterator'

export const TRANSFORM_CUSTOM_ACTOR_ID = 'transform_node'
/* Node Dimensions */
export const DEFAULT_NODE_WIDTH = 260
export const DEFAULT_NODE_HEIGHT = 75

/* Iterator Node Dimensions */
export const ITERATOR_NODE_DEFAULT_WIDTH = 350
export const ITERATOR_NODE_DEFAULT_HEIGHT = 150

/* Conditional Node Dimensions */
export const CONDITIONAL_NODE_DEFAULT_WIDTH = 260
export const CONDITIONAL_NODE_DEFAULT_HEIGHT = 170

/* Switch Node Dimensions */
export const SWITCH_NODE_DEFAULT_WIDTH = 260
export const SWITCH_NODE_DEFAULT_HEIGHT = 170

/* Note Node Dimensions */
export const NOTE_NODE_DEFAULT_WIDTH = 260
export const NOTE_NODE_DEFAULT_HEIGHT = 100

/* Z-Index */
export const NODE_Z_INDEX = {
  ITERATOR: -2, // Behind all other nodes and edges
  DEFAULT: 0, // Regular nodes
} as const

export const EDGE_Z_INDEX = -1 // Above iterator nodes, behind regular nodes

/* Edge constants */
export const EDGE_TYPES = {
  DEFAULT: 'default' as const,
  SMOOTHSTEP: 'smoothstep' as const,
  BACKWARDS: 'backwards' as const,
}

export const DEFAULT_EDGE_STYLE = {
  animated: true,
  animationDuration: '.8s',
  type: 'default' as const,
  pathOptions: { curvature: 0.5 },
}

export const BACKWARDS_EDGE_DASH = '5,5'

/* Handles */
export const HANDLES = {
  THEN: 'then',
  OTHERWISE: 'otherwise',
  SWITCH_CASE_PREFIX: 'condition_',
  SWITCH_DEFAULT: 'condition_default',
}

/* Node Change Types */
export const NODE_CHANGE_TYPE = {
  POSITION: 'position',
  SELECT: 'select',
  REMOVE: 'remove',
  DIMENSIONS: 'dimensions',
} as const

/* Edge Change Types */
export const EDGE_CHANGE_TYPE = {
  REMOVE: 'remove',
  SELECT: 'select',
} as const

/* Config Panel Headers */
export const CONFIG_PANEL_HEADERS = {
  NODE: 'Node configuration',
  CONNECTION: 'Connection configuration',
  WORKFLOW: 'Workflow configuration',
} as const

/* Actor Field Mapping */
export const ACTOR_FIELD_MAP = {
  assistant: 'assistant_id',
  tool: 'tool_id',
  custom_node: 'custom_node_id',
  transform: 'custom_node_id',
} as const
