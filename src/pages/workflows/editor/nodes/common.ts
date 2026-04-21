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

import { NodeProps, NodeChange } from '@xyflow/react'

import { WorkflowExecutionStatus } from '@/types/entity'
import { WorkflowConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'
import { cn } from '@/utils/utils'
import { ConfigurationUpdate } from '@/utils/workflowEditor/actions'
import { NodeHandlesStatus } from '@/utils/workflowEditor/helpers/executions/common'

export interface CommonNodeProps extends NodeProps {
  id: string
  data: {
    highlighted?: boolean
    getConfig: () => WorkflowConfiguration
    findState: (stateID: string) => StateConfiguration
    updateConfig: (update: ConfigurationUpdate) => void
    removeState: (nodeID: string) => void
    onNodesChange: (changes: NodeChange[]) => void
    isFullscreen?: boolean
    hasError: boolean
    status?: WorkflowExecutionStatus
    success?: number
    failures?: number
    totalItems?: number
    active?: boolean
    handlesStatus?: NodeHandlesStatus
  }
}

export const getStatusBorderClass = (status?: WorkflowExecutionStatus) => {
  return cn({
    '!border-success-primary': status === 'Succeeded',
    '!border-failed-primary': status === 'Failed',
    '!border-in-progress-primary': status === 'In Progress',
    '!border-aborted-primary': status === 'Aborted',
    '!border-interrupted-primary': status === 'Interrupted',
  })
}

export const getEdgeStatusClass = (status?: WorkflowExecutionStatus) => {
  if (!status) return ''

  const statusMap: Record<Exclude<WorkflowExecutionStatus, 'Not Started'>, string> = {
    Succeeded: 'xyflow-edge__edge-path_success',
    Failed: 'xyflow-edge__edge-path_failed',
    'In Progress': 'xyflow-edge__edge-path_in-progress',
    Aborted: 'xyflow-edge__edge-path_aborted',
    Interrupted: 'xyflow-edge__edge-path_interrupted',
  }

  return statusMap[status] ?? ''
}
