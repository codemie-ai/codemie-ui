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

import { useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Pagination from '@/components/Pagination'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

import WorkflowExecutionActions from './executions/WorkflowExecutionActions/WorkflowExecutionActions'
import WorkflowExecutionConfiguration from './executions/WorkflowExecutionConfiguration/WorkflowExecutionConfiguration'
import WorkflowExecutionDetails from './executions/WorkflowExecutionDetails/WorkflowExecutionDetails'
import WorkflowExecutionHeader from './executions/WorkflowExecutionHeader'
import WorkflowExecutionHistory from './executions/WorkflowExecutionHistory/WorkflowExecutionHistory'
import WorkflowExecutionPrompt from './executions/WorkflowExecutionPrompt'
import WorkflowExecutionStates from './executions/WorkflowExecutionStates/WorkflowExecutionStates'

const WorkflowExecutionPage = () => {
  const router = useVueRouter()
  const workflowIdParam = router.currentRoute.value.params.workflowId as string
  const executionIdParam = router.currentRoute.value.params.executionId as string
  const pageQuery = router.currentRoute.value.query.page

  const [isConfigExpanded, setIsConfigExpanded] = useState(false)
  const { workflow, execution, executionStatesPagination } = useSnapshot(
    workflowExecutionsStore
  ) as typeof workflowExecutionsStore

  const hasPagination = executionStatesPagination.totalPages > 1

  const handleSetPage = async (newPage: number) => {
    workflowExecutionsStore.setExecutionStatesPagination({ page: newPage })
    router.push({ query: { ...router.currentRoute.value.query, page: newPage + 1 } })
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always refresh workflow to show latest config
        await workflowExecutionsStore.getWorkflow(workflowIdParam)

        const isNewWorkflow = workflowIdParam !== workflowExecutionsStore.workflow?.id
        const isNewExecution = executionIdParam !== workflowExecutionsStore.execution?.id

        if (isNewWorkflow) {
          await workflowExecutionsStore.getExecutions(workflowIdParam)
        }

        if (isNewExecution) {
          await workflowExecutionsStore.getExecution(workflowIdParam, executionIdParam)

          const pageFromUrl = pageQuery ? Number(pageQuery) - 1 : 0
          workflowExecutionsStore.setExecutionStatesPagination({ page: pageFromUrl })
        }
      } catch (error) {
        console.error('Error fetching workflow data: ', error)
      }
    }

    fetchData()
    if (!executionIdParam) router.replace({ name: 'workflows' })
  }, [workflowIdParam, executionIdParam])

  useEffect(() => {
    workflowExecutionsStore.getExecutions(workflowIdParam)

    return () => {
      workflowExecutionsStore.removeExecution()
    }
  }, [])

  useEffect(() => {
    workflowExecutionsStore.setExecutionStatesPagination({
      page: pageQuery ? Number(pageQuery) - 1 : 0,
    })
  }, [pageQuery])

  return (
    <div className="flex flex-col h-full max-h-full">
      <WorkflowExecutionHeader
        worfklowId={workflow?.id}
        workflowName={workflow?.name}
        isConfigExpanded={isConfigExpanded}
        onToggleConfig={() => setIsConfigExpanded((prev) => !prev)}
      />

      {workflow && (
        <div className="flex grow min-h-0">
          <WorkflowExecutionHistory
            workflowId={workflow.id}
            executionId={execution?.execution_id}
          />

          <div className="flex flex-col grow">
            <div className="flex grow overflow-hidden">
              {execution && (
                <div
                  key={execution.execution_id}
                  className="grow flex flex-col overflow-y-auto scrollbar-gutter-edge px-2 show-scroll bg-surface-base-primary"
                >
                  <div className="flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-surface-base-primary p-5 pb-3">
                    <WorkflowExecutionDetails execution={execution} />
                    <WorkflowExecutionActions execution={execution} workflowId={workflow.id} />
                  </div>

                  <WorkflowExecutionPrompt prompt={execution.prompt} />
                  <WorkflowExecutionStates
                    key={executionStatesPagination.page}
                    workflowId={workflow.id}
                    executionId={execution.execution_id}
                    executionStatus={execution.overall_status}
                    paginationPage={executionStatesPagination.page}
                    paginationTotalPages={executionStatesPagination.totalPages}
                  />
                </div>
              )}

              <WorkflowExecutionConfiguration
                workflow={workflow}
                execution={execution}
                isExpanded={isConfigExpanded}
              />
            </div>

            {hasPagination && (
              <Pagination
                className="py-4 px-7"
                setPage={handleSetPage}
                currentPage={executionStatesPagination.page}
                totalPages={executionStatesPagination.totalPages}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowExecutionPage
