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

import { ExtendedWorkflowExecution, WorkflowExecution } from '@/types/entity/workflow'

/**
 * Time period constants for execution grouping (in milliseconds)
 */
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

interface ExecutionGroups {
  /** Executions from the last 7 days */
  latestExecutions: ExtendedWorkflowExecution[]
  /** Executions from 7-30 days ago */
  laterExecutions: ExtendedWorkflowExecution[]
  /** Executions older than 30 days */
  otherExecutions: ExtendedWorkflowExecution[]
}

/**
 * Custom hook to group workflow executions by time period
 *
 * Groups executions into three categories:
 * - Last 7 days
 * - Last 30 days (excluding last 7 days)
 * - Earlier (older than 30 days)
 *
 * Each execution is enriched with an index calculated from the total count,
 * which represents its position in the overall execution history.
 *
 * @param executions - Array of workflow executions to group
 * @param totalCount - Total count of all executions (for calculating index)
 * @returns Object containing three arrays of grouped executions
 *
 * @example
 * ```tsx
 * const { latestExecutions, laterExecutions, otherExecutions } = useExecutionGroups(
 *   executions,
 *   executionsPagination.totalCount
 * )
 * ```
 */
export const useExecutionGroups = (
  executions: WorkflowExecution[],
  totalCount?: number
): ExecutionGroups => {
  return useMemo(() => {
    const now = Date.now()
    const date7DaysAgo = now - ONE_WEEK_MS
    const date30DaysAgo = now - ONE_MONTH_MS

    const latestExecutions: ExtendedWorkflowExecution[] = []
    const laterExecutions: ExtendedWorkflowExecution[] = []
    const otherExecutions: ExtendedWorkflowExecution[] = []

    const totalExecutions = totalCount ?? executions.length

    for (let i = 0; i < executions.length; i += 1) {
      const execution = executions[i]
      const calculatedIndex = totalExecutions - i

      if (execution.date) {
        const executionTime = new Date(execution.date).getTime()
        const executionWithIndex = { ...execution, index: calculatedIndex }

        if (executionTime > date7DaysAgo) {
          latestExecutions.push(executionWithIndex)
        } else if (executionTime > date30DaysAgo) {
          laterExecutions.push(executionWithIndex)
        } else {
          otherExecutions.push(executionWithIndex)
        }
      }
    }

    return {
      latestExecutions,
      laterExecutions,
      otherExecutions,
    }
  }, [executions, totalCount])
}
