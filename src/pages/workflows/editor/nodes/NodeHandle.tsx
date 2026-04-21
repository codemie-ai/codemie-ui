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

import {
  Handle as ReactFlowHandle,
  useNodeConnections,
  HandleProps,
  HandleType,
} from '@xyflow/react'

import { WorkflowExecutionStatus } from '@/types/entity'
import { cn } from '@/utils/utils'

import { getStatusBorderClass } from './common'

interface NodeHandleProps extends HandleProps {
  connectionCount?: number
  type: HandleType
  status?: WorkflowExecutionStatus
}

const NodeHandle = (props: NodeHandleProps) => {
  const { connectionCount = Infinity, ...rest } = props
  const connections = useNodeConnections({ handleType: props.type })

  return (
    <ReactFlowHandle
      {...rest}
      isConnectable={connections.length < connectionCount}
      className={cn(
        '!bg-surface-base-chat !border-1 !border-border-specific-node-border !w-[18px] !h-[18px]',
        'hover:!border-1.5 hover:!border-border-specific-node-border-focus',
        'transition-all duration-100',
        getStatusBorderClass(props.status),
        rest.className
      )}
    />
  )
}

export default NodeHandle
