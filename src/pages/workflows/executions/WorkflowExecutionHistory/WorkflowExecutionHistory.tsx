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

import { FC, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import SidebarToggle from '@/components/Sidebar/SidebarToggle'
import Spinner from '@/components/Spinner'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { usePolling } from '@/hooks/usePolling'
import { appInfoStore } from '@/store/appInfo'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecution } from '@/types/entity/workflow'
import { cn } from '@/utils/utils'

import WorkflowExecutionHistoryList from './WorkflowExecutionHistoryList'

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000
const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000

interface WorkflowExecutionHistoryProps {
  workflowId: string
  executionId?: string
}

const WorkflowExecutionHistory: FC<WorkflowExecutionHistoryProps> = ({
  workflowId,
  executionId,
}) => {
  const { sidebarExpanded } = useSnapshot(appInfoStore)
  const { executions, isLoadingMoreExecutions, hasMoreExecutions } = useSnapshot(
    workflowExecutionsStore
  ) as typeof workflowExecutionsStore

  const isPollingEnabled = useMemo(
    () =>
      executions.some(
        (ex) =>
          !WORKFLOW_FINAL_STATUSES.includes(ex.overall_status) && ex.execution_id !== executionId
      ),
    [executions, executionId]
  )

  usePolling({
    enabled: isPollingEnabled,
    fetchFn: () => workflowExecutionsStore.getExecutions(workflowId),
  })

  const sentinelRef = useInfiniteScroll({
    enabled: true,
    isLoading: isLoadingMoreExecutions,
    hasMore: hasMoreExecutions,
    onLoadMore: () => {
      workflowExecutionsStore.loadMoreExecutions(workflowId)
    },
  })

  const executionGroups = useMemo(() => {
    const now = Date.now()
    const date7DaysAgo = now - ONE_WEEK_IN_MS
    const date30DaysAgo = now - ONE_MONTH_IN_MS

    const latestExecutions: WorkflowExecution[] = []
    const laterExecutions: WorkflowExecution[] = []
    const otherExecutions: WorkflowExecution[] = []

    for (const execution of executions) {
      if (execution.date) {
        const executionTime = new Date(execution.date).getTime()

        if (executionTime > date7DaysAgo) latestExecutions.push(execution)
        else if (executionTime > date30DaysAgo) laterExecutions.push(execution)
        else otherExecutions.push(execution)
      }
    }

    return {
      latestExecutions,
      laterExecutions,
      otherExecutions,
    }
  }, [executions])

  return (
    <aside
      className={cn(
        'transition-all shrink-0 duration-150 overflow-x-hidden border-border-specific-sidebar border-r bg-sidebar-gradient',
        sidebarExpanded ? 'w-workflow-exec-sidebar' : 'w-0'
      )}
    >
      <div className="flex flex-col w-workflow-exec-sidebar max-h-full">
        <h2 className="pt-4 pb-3 pl-2 font-semibold mx-4">Workflow Execution History</h2>

        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain max-h-full show-scroll px-4 pb-4">
          <WorkflowExecutionHistoryList
            title="Last 7 days"
            executionId={executionId}
            executions={executionGroups.latestExecutions}
          />

          <WorkflowExecutionHistoryList
            title="Last 30 days"
            executionId={executionId}
            executions={executionGroups.laterExecutions}
          />

          <WorkflowExecutionHistoryList
            title="Earlier"
            executionId={executionId}
            executions={executionGroups.otherExecutions}
          />

          {/* Sentinel element for infinite scroll */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator */}
          {isLoadingMoreExecutions && <Spinner className="w-6 h-6" rootClassName="py-4 min-h-0" />}
        </div>
      </div>

      <SidebarToggle />
    </aside>
  )
}

export default WorkflowExecutionHistory
