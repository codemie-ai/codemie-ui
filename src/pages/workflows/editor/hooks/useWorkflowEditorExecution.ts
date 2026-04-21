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

import { useMemo } from 'react'

import { ExtendedWorkflowExecutionState, WorkflowExecutionStatus } from '@/types/entity'
import { WorkflowEdge, WorkflowNode } from '@/types/workflowEditor/base'
import { StateConfiguration } from '@/types/workflowEditor/configuration'
import { END_NODE_ID, START_NODE_ID } from '@/utils/workflowEditor/constants'
import { findParents } from '@/utils/workflowEditor/helpers'

import {
  applyExecutionStates,
  removeNonExistingStates,
} from '../../../../utils/workflowEditor/helpers/executions'
import {
  buildIterationStatsMap,
  buildIterationSummariesMap,
  IterationStatsMap,
  IterationSummariesMap,
} from '../../../../utils/workflowEditor/helpers/executions/buildIterationMaps'
import { groupIterationStates } from '../../../../utils/workflowEditor/helpers/executions/groupIterationStates'

export type StatesStatusMap = Map<string, WorkflowExecutionStatus>
export type EdgeStatusMap = Map<string, WorkflowExecutionStatus>
export type HandlesStatusMap = Map<string, Map<string, WorkflowExecutionStatus | null>>

interface UseWorkflowEditorExecutionParams {
  executionEnabled: boolean | undefined
  executionStates: ExtendedWorkflowExecutionState[] | undefined
  executionActiveStateId: string | null | undefined
  overallExecutionStatus?: WorkflowExecutionStatus | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  configStates: StateConfiguration[]
}

export interface UseWorkflowEditorExecutionReturn {
  statesStatusMap: StatesStatusMap
  edgesStatusMap: EdgeStatusMap
  handlesStatusMap: HandlesStatusMap
  iterationStatsMap: IterationStatsMap
  iterationSummariesMap: IterationSummariesMap
  activeStateId?: string | null
  isEnabled: boolean
  getNodeExecutionData: (nodeId: string) => NodeExecutionData
  processedNodes: WorkflowNode[]
  processedEdges: WorkflowEdge[]
}

export interface NodeExecutionData {
  status?: WorkflowExecutionStatus
  isActive: boolean
  iterationStats?: {
    success: number
    failures: number
  }
  totalItems?: number
}

/**
 * Hook for managing workflow execution data (statuses, iterations, active state)
 * Provides a unified interface for execution-related features
 *
 * @param executionEnabled - Whether execution features are enabled
 * @param executionStatuses - Array of state status mappings
 * @param executionStates - Iteration execution states for iterator nodes
 * @param executionActiveStateId - ID of currently active/running state
 * @param nodes - Workflow nodes for processing
 * @param configStates - State configurations for special node handling
 * @returns Context with execution data and helper methods
 */
export const useWorkflowEditorExecution = ({
  executionEnabled,
  executionStates: executionStates2 = [],
  executionActiveStateId,
  overallExecutionStatus,
  configStates,
  edges,
  nodes,
}: UseWorkflowEditorExecutionParams): UseWorkflowEditorExecutionReturn => {
  const enabled = executionEnabled ?? false
  const executionStates = removeNonExistingStates(executionStates2, configStates)

  const groupedStates = useMemo(() => {
    if (!enabled) return []
    return groupIterationStates(executionStates, configStates)
  }, [enabled, executionStates, configStates])

  const iterationStatsMap: IterationStatsMap = useMemo(() => {
    if (!enabled) return new Map()
    return buildIterationStatsMap(groupedStates)
  }, [groupedStates, enabled])

  const iterationSummariesMap: IterationSummariesMap = useMemo(() => {
    if (!enabled) return new Map()
    return buildIterationSummariesMap(groupedStates)
  }, [groupedStates, enabled])

  const { processedNodes, processedEdges, statesStatusMap, edgesStatusMap, handlesStatusMap } =
    // eslint-disable-next-line sonarjs/cognitive-complexity
    useMemo(() => {
      if (!enabled) {
        return {
          processedNodes: nodes,
          processedEdges: edges,
          statesStatusMap: new Map<string, WorkflowExecutionStatus>(),
          edgesStatusMap: new Map<string, WorkflowExecutionStatus>(),
          handlesStatusMap: new Map<string, Map<string, WorkflowExecutionStatus | null>>(),
        }
      }

      // Inject START and END nodes into execution states
      let enhancedExecutionStates = [...executionStates]

      // 1. Always add START node with 'Succeeded' status (when execution is enabled)
      if (executionStates.length > 0) {
        const startNodeExists = executionStates.some((s) => s.resolvedId === START_NODE_ID)
        if (!startNodeExists) {
          // Find the first executed state (one with null or empty preceding_state_ids)
          const firstState = executionStates.find(
            (s) => !s.preceding_state_ids || s.preceding_state_ids.length === 0
          )

          // Add START node
          const startNode: ExtendedWorkflowExecutionState = {
            id: START_NODE_ID,
            name: START_NODE_ID,
            status: 'Succeeded' as WorkflowExecutionStatus,
            resolvedId: START_NODE_ID,
            date: null,
            update_date: null,
            execution_id: executionStates[0]?.execution_id || '',
            task: null,
            started_at: null,
            completed_at: null,
            output: null,
            error: null,
            thoughts: [],
            preceding_state_ids: null,
            state_id: START_NODE_ID,
          }

          // Update first state to point to START
          if (firstState) {
            enhancedExecutionStates = enhancedExecutionStates.map((s) =>
              s.id === firstState.id ? { ...s, preceding_state_ids: [START_NODE_ID] } : s
            )
          }

          enhancedExecutionStates = [startNode, ...enhancedExecutionStates]
        }
      }

      // 2. Add END node when execution has terminal status and parents have status
      const shouldAddEndNode =
        overallExecutionStatus &&
        overallExecutionStatus !== 'In Progress' &&
        overallExecutionStatus !== 'Interrupted'

      if (shouldAddEndNode && executionStates.length > 0) {
        const endNodeExists = executionStates.some((s) => s.resolvedId === END_NODE_ID)
        if (!endNodeExists) {
          // Find parents of END_NODE_ID
          const endNodeParents = findParents(END_NODE_ID, configStates)
          // Check if any parent has execution status
          const stateNamesSet = new Set(executionStates.map((s) => s.resolvedId))
          const hasParentWithStatus = endNodeParents.some((parentId) => stateNamesSet.has(parentId))

          if (hasParentWithStatus) {
            const lastState = enhancedExecutionStates
              .filter((s) => s.resolvedId !== START_NODE_ID)
              ?.at(-1)

            enhancedExecutionStates = [
              ...enhancedExecutionStates,
              {
                id: END_NODE_ID,
                name: END_NODE_ID,
                status: overallExecutionStatus,
                resolvedId: END_NODE_ID,
                date: null,
                update_date: null,
                execution_id: executionStates[0]?.execution_id || '',
                task: null,
                started_at: null,
                completed_at: null,
                output: null,
                error: null,
                thoughts: [],
                preceding_state_ids: lastState?.resolvedId ? [lastState.resolvedId] : null,
                state_id: END_NODE_ID,
              } as ExtendedWorkflowExecutionState,
            ]
          }
        }
      }

      const result = applyExecutionStates({
        nodes,
        edges,
        configStates,
        executionStates: enhancedExecutionStates,
        debug: { showExecutionPath: false },
      })

      const statesMap = new Map<string, WorkflowExecutionStatus>()
      const edgesMap = new Map<string, WorkflowExecutionStatus>()
      const handlesMap = new Map<string, Map<string, WorkflowExecutionStatus | null>>()

      result.nodes.forEach((node) => {
        if (node.data?.status) {
          statesMap.set(node.id, node.data.status as WorkflowExecutionStatus)
        }
      })

      result.edges.forEach((edge) => {
        if (edge.data?.status) {
          edgesMap.set(edge.id, edge.data.status as WorkflowExecutionStatus)
        }
      })

      result.edges.forEach((edge) => {
        const edgeStatus = edgesMap.get(edge.id)
        if (edgeStatus) {
          const nodeId = edge.source
          const handleId = edge.sourceHandle ?? 'default'
          const nodeStatus = statesMap.get(nodeId)

          if (!handlesMap.has(nodeId)) {
            handlesMap.set(nodeId, new Map())
          }

          if (nodeStatus) {
            handlesMap.get(nodeId)!.set(handleId, nodeStatus)
          }
        }
      })

      return {
        processedNodes: result.nodes,
        processedEdges: result.edges,
        statesStatusMap: statesMap,
        edgesStatusMap: edgesMap,
        handlesStatusMap: handlesMap,
      }
    }, [enabled, nodes, edges, configStates, executionStates, overallExecutionStatus])

  const getNodeExecutionData = useMemo(
    () =>
      (nodeId: string): NodeExecutionData => {
        return {
          status: statesStatusMap.get(nodeId),
          isActive:
            executionActiveStateId === undefined ? false : nodeId === executionActiveStateId,
          iterationStats: iterationStatsMap.get(nodeId),
          totalItems: iterationSummariesMap.get(nodeId),
        }
      },
    [statesStatusMap, iterationStatsMap, iterationSummariesMap, executionActiveStateId]
  )

  return {
    statesStatusMap,
    edgesStatusMap,
    handlesStatusMap,
    iterationStatsMap,
    iterationSummariesMap,
    activeStateId: executionActiveStateId,
    isEnabled: enabled,
    getNodeExecutionData,
    processedNodes,
    processedEdges,
  }
}
