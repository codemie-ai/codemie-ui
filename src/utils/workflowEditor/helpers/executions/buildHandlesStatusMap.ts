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

import type { WorkflowExecutionStatus } from '@/types/entity'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'
import { isDecisionState } from '@/utils/workflowEditor/helpers/states'

import type { StatusMap } from './common'
import type { Edge } from '@xyflow/react'

type BuildHandlesStatusMapParams = {
  edges: Edge[]
  edgeStatuses: Map<string, WorkflowExecutionStatus>
  configStates: StateConfiguration[]
  statesStatusMap: StatusMap
}

export const buildHandlesStatusMap = ({
  edges,
  edgeStatuses,
  configStates,
  statesStatusMap,
}: BuildHandlesStatusMapParams): StatusMap => {
  const configStatesMap = new Map(configStates.map((s) => [s.id, s]))
  const finalMap: StatusMap = new Map()

  for (const edge of edges) {
    const edgeStatus = edgeStatuses.get(edge.id)
    if (!edgeStatus) continue

    if (edge.sourceHandle) {
      const sourceState = configStatesMap.get(edge.source)
      // Decision source handles: Succeeded when the branch was taken; state status otherwise
      const status =
        sourceState && isDecisionState(sourceState)
          ? 'Succeeded'
          : statesStatusMap.get(edge.source) ?? 'Not Started'
      finalMap.set(edge.sourceHandle, status)
    }

    if (edge.targetHandle) {
      // Both Action and Decision target handles reflect the state's own status
      const status = statesStatusMap.get(edge.target) ?? 'Not Started'
      finalMap.set(edge.targetHandle, status)
    }
  }

  return finalMap
}
