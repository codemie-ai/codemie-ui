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

import { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import SidebarToggle from '@/components/Sidebar/SidebarToggle'
import Spinner from '@/components/Spinner'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { usePolling } from '@/hooks/usePolling'
import { appInfoStore } from '@/store/appInfo'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { cn } from '@/utils/utils'

import WorkflowExecutionsList from './WorkflowExecutionsList'
import { useExecutionGroups } from '../hooks/useExecutionGroups'
import useExecutionsContext from '../hooks/useExecutionsContext'

const WorkflowExecutions = () => {
  const { workflowId, executionId } = useExecutionsContext()
  const { sidebarExpanded } = useSnapshot(appInfoStore)
  const { executions, executionsPagination, isLoadingMoreExecutions, hasMoreExecutions } =
    useSnapshot(workflowExecutionsStore) as typeof workflowExecutionsStore

  usePolling({
    enabled: useMemo(() => {
      const enabled = executions.some(
        (ex) => !WORKFLOW_FINAL_STATUSES.includes(ex.overall_status) && ex.id !== executionId
      )

      return enabled
    }, [executions, executionId]),
    fetchFn: useCallback(
      () => workflowExecutionsStore.refreshExecutions(workflowId!),
      [workflowId]
    ),
  })

  const sentinelRef = useInfiniteScroll({
    enabled: true,
    isLoading: isLoadingMoreExecutions,
    hasMore: hasMoreExecutions,
    onLoadMore: () => {
      workflowExecutionsStore.loadMoreExecutions(workflowId!)
    },
  })

  const executionGroups = useExecutionGroups(executions, executionsPagination.totalCount)

  const hasExecutions = !!(
    executionGroups.laterExecutions.length ||
    executionGroups.latestExecutions.length ||
    executionGroups.otherExecutions.length
  )

  return (
    <aside
      className={cn(
        'transition-all shrink-0 duration-150 overflow-x-hidden border-border-specific-sidebar border-r bg-sidebar-gradient',
        sidebarExpanded ? 'w-workflow-exec-sidebar' : 'w-0'
      )}
    >
      <div className="flex flex-col w-workflow-exec-sidebar max-h-full h-full">
        <h2 className="pt-4 pb-3 pl-2 font-semibold mx-4">Workflow Execution History</h2>
        {!hasExecutions && (
          <h3 className="text-text-secondary text-sm mx-auto mt-[10%]">No Executions Yet</h3>
        )}

        <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain max-h-full show-scroll px-4 pb-4">
          <WorkflowExecutionsList
            title="Last 7 days"
            executions={executionGroups.latestExecutions}
          />

          <WorkflowExecutionsList
            title="Last 30 days"
            executions={executionGroups.laterExecutions}
          />

          <WorkflowExecutionsList title="Earlier" executions={executionGroups.otherExecutions} />

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

export default WorkflowExecutions
