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

import type { ExtendedWorkflowExecutionState } from '@/types/entity/workflow'
import type { WorkflowNode } from '@/types/workflowEditor'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'

import { buildEdgesStatusMap } from './buildEdgesStatusMap'
import { buildExecutionPath } from './buildExecutionPath'
import { buildHandlesStatusMap } from './buildHandlesStatusMap'
import { buildStatesStatusMap } from './buildStatesStatusMap'
import { removeNonExistingStates } from './removeNonExistingStates'

import type { Edge } from '@xyflow/react'

type ApplyExecutionStatesParams = {
  edges: Edge[]
  nodes: WorkflowNode[]
  configStates: StateConfiguration[]
  executionStates: ExtendedWorkflowExecutionState[]
  debug: { showExecutionPath: boolean }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function applyExecutionStates({
  edges,
  nodes,
  configStates,
  executionStates,
  debug,
}: ApplyExecutionStatesParams) {
  const executionPath = buildExecutionPath({
    edges,
    configStates,
    executionStates: removeNonExistingStates(executionStates, configStates),
  })
  const executedStateIds = new Set(executionPath.stateIds)

  const statesStatusMap = buildStatesStatusMap({
    configStates,
    executionStates,
    executedStateIds,
  })
  const edgesStatusMap = buildEdgesStatusMap({
    edges,
    executedEdgeStatuses: executionPath.edgeStatuses,
  })
  const handlesStatusMap = buildHandlesStatusMap({
    edges,
    edgeStatuses: executionPath.edgeStatuses,
    configStates,
    statesStatusMap,
  })

  for (const node of nodes) {
    const isExecuted = executedStateIds.has(node.id)
    node.data.executed = isExecuted
    node.data.status = statesStatusMap.get(node.id) ?? null
    node.data.handlesStatusMap = handlesStatusMap

    // Extract handles from node data if they exist
    const handles = node.data?.handles
    const executedHandleSet = new Set<string>()

    if (handles && Array.isArray(handles)) {
      for (const handle of handles) {
        if (typeof handle === 'object' && handle !== null && 'id' in handle) {
          const handleId = handle.id
          if (typeof handleId === 'string') {
            executedHandleSet.add(handleId)
          }
        }
      }
    }

    node.data.debug = {
      showExecutionPath: debug.showExecutionPath,
      executedHandles: executedHandleSet,
    }
  }

  for (const edge of edges) {
    if (!edge.data) edge.data = {}
    edge.data.status = edgesStatusMap.get(edge.id) ?? null
    edge.data.handlesStatusMap = handlesStatusMap
  }

  return { nodes, edges }
}
