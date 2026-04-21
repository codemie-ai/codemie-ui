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

import { FC, SVGProps } from 'react'

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
import { NodeType, NodeTypes } from '@/types/workflowEditor'

const nodeIconsMap: Record<NodeType, FC<SVGProps<SVGSVGElement>>> = {
  [NodeTypes.ASSISTANT]: NodeAssistantSvg,
  [NodeTypes.CONDITIONAL]: NodeConditionalSvg,
  [NodeTypes.CUSTOM]: NodeCustomSvg,
  [NodeTypes.END]: NodeEndSvg,
  [NodeTypes.ITERATOR]: NodeIteratorSvg,
  [NodeTypes.NOTE]: NodeNoteSvg,
  [NodeTypes.START]: NodeStartSvg,
  [NodeTypes.SWITCH]: NodeSwitchSvg,
  [NodeTypes.TOOL]: NodeToolSvg,
  [NodeTypes.TRANSFORM]: NodeTransformSvg,
}

interface WorkflowStateIconProps {
  type: NodeType
  className?: string
}

const WorkflowStateIcon = ({ type, className }: WorkflowStateIconProps) => {
  const Comp = nodeIconsMap[type]
  return <Comp className={className} />
}

export default WorkflowStateIcon
