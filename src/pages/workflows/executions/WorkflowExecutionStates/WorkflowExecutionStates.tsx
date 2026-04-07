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

import { FC, Fragment, useEffect, useMemo, useState, useRef } from 'react'
import { useSnapshot } from 'valtio'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonType, ButtonSize } from '@/constants'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { usePolling } from '@/hooks/usePolling'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import {
  WorkflowExecutionState as WorkflowExecutionStateType,
  WorkflowExecutionStatus,
} from '@/types/entity/workflow'

import WorkflowExecutionStateOutputPopup from './popups/WorkflowExecutionStateOutputPopup'
import WorkflowExecutionState, { WorkflowExecutionStateRef } from './WorkflowExecutionState'

interface WorkflowExecutionStatesProps {
  workflowId: string
  executionId: string
  executionStatus: WorkflowExecutionStatus
  paginationPage: number
  paginationTotalPages: number
}

const WorkflowExecutionStates: FC<WorkflowExecutionStatesProps> = ({
  workflowId,
  executionId,
  executionStatus,
  paginationPage,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isStateOutputPopupVisible, setIsStateOutputPopupVisible] = useState(false)
  const [selectedState, setSelectedState] = useState<WorkflowExecutionStateType | null>(null)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const stateRefs = useRef<Map<string, WorkflowExecutionStateRef>>(new Map())

  const { executionStates } = useSnapshot(workflowExecutionsStore) as typeof workflowExecutionsStore

  const onViewDetails = (stateId: string) => {
    const state = executionStates.find((item) => item.id === stateId)
    if (state) {
      setSelectedState(state as WorkflowExecutionStateType)
      setIsStateOutputPopupVisible(true)
    }
  }

  const expandRow = async (stateID: string) => {
    const state = executionStates.find((item) => item.id === stateID)
    if (!state) return

    const thoughtIDs = state.thoughts.map((thought) => thought.id)
    await loadHistory(thoughtIDs)
    setExpandedRows({ ...expandedRows, [stateID]: true })
  }

  const collapseRow = (stateID: string) => {
    setExpandedRows({ ...expandedRows, [stateID]: false })
  }

  const collapseAll = () => {
    setExpandedRows({})
    stateRefs.current.forEach((ref) => ref.collapseThoughts())
  }

  const expandAll = async () => {
    await workflowExecutionsStore.loadWorkflowExecutionOutputAll(workflowId, executionId)

    const newExpandedRows = executionStates.reduce((acc, state) => {
      acc[state.id] = true
      return acc
    }, {} as Record<string, boolean>)

    setExpandedRows(newExpandedRows)

    setTimeout(() => {
      stateRefs.current.forEach((ref) => ref.expandThoughts())
    }, 0)
  }

  const loadHistory = async (ids: string[], force = false) => {
    await workflowExecutionsStore.loadWorkflowExecutionOutput(workflowId, executionId, ids, force)
  }

  const handleRefreshThoughts = async (thoughtIds: string[]) => {
    await loadHistory(thoughtIds, true)
  }

  const getPendingStateIds = () =>
    executionStates
      .filter((state) => !WORKFLOW_FINAL_STATUSES.includes(state.status))
      .map((state) => state.id)

  const isPollingEnabled = useMemo(() => {
    if (WORKFLOW_FINAL_STATUSES.includes(executionStatus)) {
      const pendingStateIds = getPendingStateIds()
      if (!pendingStateIds.length) return false
    }

    return true
  }, [executionStatus, executionStates])

  const fetchStates = async () => {
    await workflowExecutionsStore.getExecutionStates(
      workflowId,
      executionId,
      paginationPage,
      10,
      true
    )

    setIsLoading(false)

    const pendingStateIds = getPendingStateIds()
    const pendingThoughtIds: string[] = []
    Object.keys(expandedRows).forEach((stateId) => {
      if (!expandedRows[stateId] || !pendingStateIds.includes(stateId)) return

      const state = executionStates.find((s) => s.id === stateId)
      if (state) pendingThoughtIds.push(...state.thoughts.map((t) => t.id))
    })

    if (pendingThoughtIds.length) loadHistory(pendingThoughtIds, true)
  }

  const fetchExecution = async () => {
    try {
      await workflowExecutionsStore.getExecution(workflowId, executionId)
    } catch (error) {
      console.error('Error fetching workflow execution: ', error)
    }
  }

  usePolling({
    enabled: isPollingEnabled,
    fetchFn: fetchExecution,
  })

  usePolling({
    enabled: isPollingEnabled,
    fetchFn: fetchStates,
  })

  useEffect(() => {
    fetchStates()
  }, [paginationPage])

  if ((!WORKFLOW_FINAL_STATUSES.includes(executionStatus) || isLoading) && !executionStates.length)
    return <Spinner inline />
  if (!executionStates.length) return null

  return (
    <div className="flex flex-col px-5">
      {executionStates.length > 0 && (
        <div className="flex flex-wrap w-full justify-between gap-2 my-6 items-center">
          <div className="font-bold text-xl">States</div>

          <div className="flex gap-2">
            <Button variant={ButtonType.SECONDARY} size={ButtonSize.MEDIUM} onClick={collapseAll}>
              <CollapseSvg />
              <span>Collapse All</span>
            </Button>

            <Button variant={ButtonType.SECONDARY} size={ButtonSize.MEDIUM} onClick={expandAll}>
              <ExpandSvg />
              Expand All
            </Button>
          </div>
        </div>
      )}

      <div className="pb-8">
        {executionStates.map((item, index) => {
          const isLastItemOnPage = index === executionStates.length - 1

          return (
            <Fragment key={item.id}>
              <WorkflowExecutionState
                ref={(el) => {
                  if (el) stateRefs.current.set(item.id, el)
                  else stateRefs.current.delete(item.id)
                }}
                state={item}
                isExpanded={!!expandedRows[item.id]}
                workflowId={workflowId}
                executionId={executionId}
                onExpand={expandRow}
                onCollapse={collapseRow}
                onViewDetails={onViewDetails}
                onRefreshThoughts={handleRefreshThoughts}
              />

              {!isLastItemOnPage && (
                <div className="w-[1px] h-[24px] bg-border-specific-panel-outline ml-6" />
              )}
            </Fragment>
          )
        })}
      </div>

      {selectedState && (
        <WorkflowExecutionStateOutputPopup
          key={selectedState.id}
          visible={isStateOutputPopupVisible}
          workflowId={workflowId}
          executionId={executionId}
          state={selectedState}
          onHide={() => setIsStateOutputPopupVisible(false)}
        />
      )}
    </div>
  )
}

export default WorkflowExecutionStates
