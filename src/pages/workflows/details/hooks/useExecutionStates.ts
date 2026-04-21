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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { usePolling } from '@/hooks/usePolling'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecutionStatus } from '@/types/entity'
import { START_NODE_ID } from '@/utils/workflowEditor/constants'

/**
 * Hook to load execution details and states with polling support
 * Handles both initial load and periodic refresh for active executions
 */
export const useExecutionStates = ({
  workflowId,
  executionId,
  isWorkflowLoading,
}: {
  workflowId: string
  executionId: string | null
  isWorkflowLoading: boolean
}) => {
  const { execution, executionStates } = useSnapshot(
    workflowExecutionsStore
  ) as typeof workflowExecutionsStore
  const [stateId, setStateId] = useState<string | null>(START_NODE_ID)
  const [isExecutionLoading, setIsExecutionLoading] = useState(true)
  const [isExecutionStatesLoading, setIsExecutionStatesLoading] = useState(true)
  const previousStatusRef = useRef<WorkflowExecutionStatus | null>(null)

  const state = useMemo(
    () => executionStates.find((state) => state.id === stateId),
    [executionStates, stateId]
  )

  useEffect(() => setStateId(START_NODE_ID), [executionId])

  useEffect(() => {
    const loadExecutionData = async () => {
      if (isWorkflowLoading) return

      setIsExecutionLoading(true)
      setIsExecutionStatesLoading(true)

      if (!workflowExecutionsStore.executions.length && !isWorkflowLoading) {
        setIsExecutionLoading(false)
        setIsExecutionStatesLoading(false)
      }

      if (!workflowId || !executionId) {
        return
      }

      try {
        await Promise.all([
          workflowExecutionsStore.getExecution(workflowId, executionId),
          workflowExecutionsStore.getExecutionStates(workflowId, executionId, {
            perPage: 10000,
          }),
        ])
      } catch (error) {
        console.error('Error loading execution data:', error)
      } finally {
        setIsExecutionLoading(false)
        setIsExecutionStatesLoading(false)
      }
    }

    loadExecutionData()
  }, [workflowId, executionId, isWorkflowLoading])

  // Refetch states when execution transitions from in-progress to final status
  useEffect(() => {
    const currentStatus = execution?.overall_status
    const previousStatus = previousStatusRef.current

    previousStatusRef.current = currentStatus ?? null

    if (
      workflowId &&
      executionId &&
      previousStatus &&
      !WORKFLOW_FINAL_STATUSES.includes(previousStatus) &&
      currentStatus &&
      WORKFLOW_FINAL_STATUSES.includes(currentStatus)
    ) {
      workflowExecutionsStore.getExecutionStates(workflowId, executionId, {
        perPage: 10000,
      })
    }
  }, [workflowId, executionId, execution?.overall_status])

  const isPollingEnabled = useMemo(
    () => !!(execution && !WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)),
    [execution]
  )

  usePolling({
    interval: 4000,
    enabled: isPollingEnabled && !!(workflowId && executionId),
    fetchFn: useCallback(async () => {
      if (!executionId) return
      await workflowExecutionsStore.getExecutionStates(workflowId, executionId, {
        perPage: 10000,
      })
    }, [workflowId, executionId]),
  })

  return { state, stateId, setStateId, isExecutionLoading, isExecutionStatesLoading }
}
