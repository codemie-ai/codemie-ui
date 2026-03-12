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

import { NodeTypes } from '@/types/workflowEditor/base'

import { AssistantNode } from './AssistantNode'
import { ConditionalNode } from './ConditionalNode'
import { CustomNode } from './CustomNode'
import { EndNode } from './EndNode'
import { IteratorNode } from './IteratorNode'
import { NoteNode } from './NoteNode'
import { StartNode } from './StartNode'
import { SwitchNode } from './SwitchNode'
import { ToolNode } from './ToolNode'
import { TransformNode } from './TransformNode'

export const nodeTypeComponents = {
  [NodeTypes.START]: StartNode,
  [NodeTypes.END]: EndNode,
  [NodeTypes.CONDITIONAL]: ConditionalNode,
  [NodeTypes.SWITCH]: SwitchNode,
  [NodeTypes.ITERATOR]: IteratorNode,
  [NodeTypes.NOTE]: NoteNode,

  [NodeTypes.ASSISTANT]: AssistantNode,
  [NodeTypes.TOOL]: ToolNode,
  [NodeTypes.CUSTOM]: CustomNode,
  [NodeTypes.TRANSFORM]: TransformNode,
}
