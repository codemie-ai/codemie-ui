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

import type { ExtendedWorkflowExecutionState, WorkflowExecutionStatus } from '@/types/entity'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'
import { isDecisionState } from '@/utils/workflowEditor/helpers/states'

import type { Edge } from '@xyflow/react'

type BuildExecutionPathParams = {
  executionStates: ExtendedWorkflowExecutionState[]
  configStates: StateConfiguration[]
  edges: Edge[]
}

type BuildExecutionPathReturn = {
  stateIds: string[]
  edgeStatuses: Map<string, WorkflowExecutionStatus>
}

// Build next IDs from edges (edges are source of truth for connections)
const buildNextIdsFromEdges = (edges: Edge[]): Map<string, string[]> => {
  const nextMap = new Map<string, string[]>()
  edges.forEach((edge) => {
    const existing = nextMap.get(edge.source) || []
    if (!existing.includes(edge.target)) {
      existing.push(edge.target)
    }
    nextMap.set(edge.source, existing)
  })
  return nextMap
}

export const buildExecutionPath = ({
  executionStates,
  configStates,
  edges,
}: BuildExecutionPathParams): BuildExecutionPathReturn => {
  const activeStates = new Set<string>()

  const configStatesMap = new Map(configStates.map((s) => [s.id, s]))
  const nextMap = buildNextIdsFromEdges(edges)

  const edgesBySourceTarget = new Map<string, Edge[]>()
  for (const edge of edges) {
    const key = `${edge.source}\0${edge.target}`
    const existing = edgesBySourceTarget.get(key) ?? []
    existing.push(edge)
    edgesBySourceTarget.set(key, existing)
  }
  const edgeStatuses = new Map<string, WorkflowExecutionStatus>()

  const recordConnection = (
    sourceId: string,
    targetId: string,
    status: WorkflowExecutionStatus
  ): void => {
    const edgesForConnection = edgesBySourceTarget.get(`${sourceId}\0${targetId}`)
    if (!edgesForConnection) return

    activeStates.add(sourceId)
    activeStates.add(targetId)

    for (const edge of edgesForConnection) {
      edgeStatuses.set(edge.id, status)
    }
  }

  /**
   * Records every edge on the config path from startId to endId.
   *
   * Decision nodes are invisible to the execution log — they are never recorded
   * as executed states. When the log says "A preceded B", the actual graph path
   * may be A → Decision → B. This function bridges those gaps by recursing
   * through Decision nodes until it reaches the logged target.
   */
  const recordPath = ({
    startId,
    endId,
    status, // Pass the status of the current execution run
    visited = new Set(),
    isInitialCall = true,
  }: {
    startId: string
    endId: string
    status: WorkflowExecutionStatus // Add this
    visited?: Set<string>
    isInitialCall?: boolean
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 123
  }): boolean => {
    if (!isInitialCall && startId === endId) return true

    // Check if startId exists in config - if not, we can't traverse from it
    if (!configStatesMap.has(startId)) return false

    const nextIds = nextMap.get(startId) || []
    if (nextIds.length === 0 || visited.has(startId)) return false
    visited.add(startId)

    let foundPath = false

    for (const nextId of nextIds) {
      const nextStateConfig = configStatesMap.get(nextId)

      const isDirectHit = nextId === endId
      const isDecisionBridge =
        nextStateConfig &&
        isDecisionState(nextStateConfig) &&
        recordPath({ startId: nextId, endId, status, visited, isInitialCall: false })

      if (isDirectHit || isDecisionBridge) {
        /**
         * Logic:
         * 1. If we are pointing to a Decision node (isDecisionBridge), that transition
         *    itself was successful (we reached the decision).
         * 2. If we are pointing to the final target Action node (isDirectHit),
         *    use the actual status from the log (which might be Failed).
         */
        const effectiveStatus =
          nextStateConfig && isDecisionState(nextStateConfig) ? 'Succeeded' : status

        recordConnection(startId, nextId, effectiveStatus)
        foundPath = true
      }
    }
    return foundPath
  }

  for (const es of executionStates) {
    if (!es.preceding_state_ids || es.preceding_state_ids.length === 0) continue

    for (const precedingStateId of es.preceding_state_ids) {
      recordPath({
        startId: precedingStateId,
        endId: es.resolvedId,
        status: es.status,
      })
    }
  }

  return {
    stateIds: Array.from(activeStates),
    edgeStatuses,
  }
}
