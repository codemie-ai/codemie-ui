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

import { Edge, Node } from '@xyflow/react'
import React from 'react'

import NodeAssistantSvg from '@/assets/icons/node-assistant.svg?react'
import NodeConditionalSvg from '@/assets/icons/node-conditional.svg?react'
import NodeCustomSvg from '@/assets/icons/node-custom.svg?react'
import NodeEndSvg from '@/assets/icons/node-end.svg?react'
import NodeIteratorSvg from '@/assets/icons/node-iterator.svg?react'
import NodeNoteSvg from '@/assets/icons/node-note.svg?react'
import NodeStartSvg from '@/assets/icons/node-start.svg?react'
import NodeSwitchSvg from '@/assets/icons/node-switch.svg?react'
import NodeToolSvg from '@/assets/icons/node-tool.svg?react'
import NodeTransformSvg from '@/assets/icons/node-transform.svg?react'

export const NodeTypes = {
  ASSISTANT: 'assistant',
  CUSTOM: 'custom',
  TOOL: 'tool',
  TRANSFORM: 'transform',

  START: 'start',
  END: 'end',
  CONDITIONAL: 'conditional',
  SWITCH: 'switch',
  ITERATOR: 'iterator',
  NOTE: 'note',
} as const

export const MetaNodeTypes: string[] = [
  NodeTypes.START,
  NodeTypes.END,
  NodeTypes.CONDITIONAL,
  NodeTypes.SWITCH,
  NodeTypes.ITERATOR,
  NodeTypes.NOTE,
] as const

export type NodeType = (typeof NodeTypes)[keyof typeof NodeTypes]

export enum ActorTypes {
  Assistant = 'assistant',
  Tool = 'tool',
  CustomNode = 'custom_node',
  Transform = 'transform',
}

export const NodeTemplateCategory = {
  CONTROL: 'control',
  ACTION: 'action',
  OTHER: 'other',
  HIDDEN: 'hidden',
} as const

export type NodeTemplateCategoryType =
  (typeof NodeTemplateCategory)[keyof typeof NodeTemplateCategory]

export interface NodeTemplate {
  type: NodeType
  label: string
  icon: React.ReactNode
  category: NodeTemplateCategoryType
}

export const nodeTemplates: NodeTemplate[] = [
  {
    type: NodeTypes.START,
    label: 'Start',
    icon: React.createElement(NodeStartSvg),
    category: NodeTemplateCategory.HIDDEN,
  },
  {
    type: NodeTypes.END,
    label: 'End',
    icon: React.createElement(NodeEndSvg),
    category: NodeTemplateCategory.HIDDEN,
  },
  {
    type: NodeTypes.CONDITIONAL,
    label: 'Conditional',
    icon: React.createElement(NodeConditionalSvg),
    category: NodeTemplateCategory.CONTROL,
  },
  {
    type: NodeTypes.SWITCH,
    label: 'Switch',
    icon: React.createElement(NodeSwitchSvg),
    category: NodeTemplateCategory.CONTROL,
  },
  {
    type: NodeTypes.ITERATOR,
    label: 'Iterator',
    icon: React.createElement(NodeIteratorSvg),
    category: NodeTemplateCategory.CONTROL,
  },
  {
    type: NodeTypes.ASSISTANT,
    label: 'Assistant',
    icon: React.createElement(NodeAssistantSvg),
    category: NodeTemplateCategory.ACTION,
  },
  {
    type: NodeTypes.TOOL,
    label: 'Tool',
    icon: React.createElement(NodeToolSvg),
    category: NodeTemplateCategory.ACTION,
  },
  {
    type: NodeTypes.CUSTOM,
    label: 'Custom',
    icon: React.createElement(NodeCustomSvg),
    category: NodeTemplateCategory.ACTION,
  },
  {
    type: NodeTypes.TRANSFORM,
    label: 'Transform',
    icon: React.createElement(NodeTransformSvg),
    category: NodeTemplateCategory.ACTION,
  },
  {
    type: NodeTypes.NOTE,
    label: 'Note',
    icon: React.createElement(NodeNoteSvg),
    category: NodeTemplateCategory.OTHER,
  },
]

export type WorkflowNode = Node
export type WorkflowEdge = Edge
