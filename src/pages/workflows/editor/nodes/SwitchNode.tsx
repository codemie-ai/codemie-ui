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

import { Position, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect } from 'react'

import { NodeTypes } from '@/types/workflowEditor/base'
import { getStateNext } from '@/utils/workflowEditor/helpers/states'

import BaseNode from './BaseNode'
import { CommonNodeProps } from './common'
import NodeField from './NodeField'
import Handle from './NodeHandle'
import NodeHeader from './NodeHeader'

export const SwitchNode = ({ id, data, selected }: CommonNodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals()
  const state = data.findState(id)
  const isConnected = state?._meta?.is_connected ?? false
  const switchData = getStateNext(state)?.switch
  const cases = switchData?.cases || []

  useEffect(() => {
    updateNodeInternals(id)
  }, [cases.length, id, updateNodeInternals])

  return (
    <BaseNode selected={selected} isConnected={isConnected}>
      <Handle type="target" position={Position.Left} />
      <NodeHeader type={NodeTypes.SWITCH} title="Switch" />

      <div className="flex flex-col gap-4 mb-4">
        {cases.map((caseItem, index) => {
          const condition = caseItem.condition || `case ${index + 1}`
          const key = index

          return (
            <div key={key} className="relative">
              <NodeField title={`Case ${index + 1}`} value={condition} />
              <Handle
                type="source"
                position={Position.Right}
                id={`condition_${index}`}
                className="!top-[36px]"
              />
            </div>
          )
        })}

        <div className="relative">
          <NodeField title="Else" value="(default)" />
          <Handle
            type="source"
            position={Position.Right}
            id="condition_default"
            className="!top-[36px]"
          />
        </div>
      </div>
    </BaseNode>
  )
}
