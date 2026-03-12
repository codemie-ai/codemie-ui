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

import { Position } from '@xyflow/react'

import { NodeTypes } from '@/types/workflowEditor/base'

import BaseNode from './BaseNode'
import { CommonNodeProps } from './common'
import Handle from './NodeHandle'
import NodeHeader from './NodeHeader'

export const CustomNode = ({ data, selected, id }: CommonNodeProps) => {
  const state = data.findState(id)
  const isConnected = state?._meta?.is_connected ?? false
  const hasError = data.stateErrors?.has(id) ?? false

  return (
    <BaseNode selected={selected} isConnected={isConnected} hasError={hasError}>
      <Handle type="target" position={Position.Left} />
      <NodeHeader type={NodeTypes.CUSTOM} title={id} />
      <Handle type="source" position={Position.Right} />
    </BaseNode>
  )
}
