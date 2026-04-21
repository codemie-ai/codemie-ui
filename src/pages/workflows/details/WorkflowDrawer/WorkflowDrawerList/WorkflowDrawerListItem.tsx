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

import { useState } from 'react'

import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import StatusIndicator from '@/components/StatusIndicator'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { computeTimeDifference } from '@/pages/workflows/utils/computeTimeDifference'
import { ExtendedWorkflowExecutionState, WorkflowExecutionStatus } from '@/types/entity'
import { NodeType, NodeTypes } from '@/types/workflowEditor'
import { cn } from '@/utils/utils'

import WorkflowStateIcon from '../../WorkflowStateIcon'

interface WorkflowDrawerListItemProps {
  id: string
  name: string
  type: NodeType
  status?: WorkflowExecutionStatus
  startedAt?: string | null
  completedAt?: string | null
  items?: ExtendedWorkflowExecutionState[]
  stateId: string | null
  onClick: (stateId: string) => void
  nested?: boolean
}

const WorkflowDrawerListItem = ({
  id,
  name,
  type,
  status,
  startedAt,
  completedAt,
  items,
  stateId,
  nested,
  onClick,
}: WorkflowDrawerListItemProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const isSucceeded = status === 'Succeeded'
  const isAborted = status === 'Aborted'
  const isInProgress = status === 'In Progress'
  const isFailed = status === 'Failed'
  const isInterrupted = status === 'Interrupted'
  const isNotStarted = status === 'Not Started'

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => {
          if (items) setIsOpen((prev) => !prev)
          else onClick(id)
        }}
        className={cn(
          'flex justify-between rounded-lg items-center gap-4 p-2 text-xs hover:bg-surface-specific-secondary-button-hover transition duration-75 hover:duration-0',
          stateId === id && 'bg-surface-specific-button-secondary',
          nested && 'pl-5'
        )}
      >
        <div className="flex items-center overflow-hidden text-nowrap">
          {items ? (
            <ChevronRightSvg className={cn('size-3.5', isOpen && 'rotate-90')} />
          ) : (
            <div className="w-3.5" />
          )}
          <WorkflowStateIcon type={type} className="size-6 min-w-6 ml-1 mr-2" />
          <div className="truncate text-left">{name}</div>
        </div>
        <div className="flex gap-2 items-center text-nowrap">
          <div
            className={cn(
              'text-text-quaternary',
              isFailed && 'text-text-error',
              isAborted && 'text-aborted-primary',
              isInProgress && 'text-in-progress-primary',
              isInterrupted && 'text-interrupted-primary'
            )}
          >
            {isFailed && 'Failed'}
            {isAborted && 'Aborted'}
            {isInterrupted && 'Interrupted'}
            {isNotStarted && 'Not Started'}
            {isSucceeded &&
              startedAt &&
              completedAt &&
              computeTimeDifference(startedAt, completedAt)}
          </div>
          {status && !isNotStarted && (
            <StatusIndicator
              naked
              status={WORKFLOW_STATUS_BADGE_MAPPING[status]}
              className={cn('size-5 min-w-5 max-w-5', status === 'Aborted' && 'size-4')}
            />
          )}
        </div>
      </button>

      {isOpen &&
        items &&
        items
          .sort((a, b) => (a.iteration_number ?? 0) - (b.iteration_number ?? 0))
          .map((state) => (
            <WorkflowDrawerListItem
              key={state.id}
              id={state.id}
              name={state.name}
              type={state.type ?? NodeTypes.ASSISTANT}
              status={state.status}
              startedAt={state.started_at}
              completedAt={state.completed_at}
              stateId={stateId}
              onClick={onClick}
              nested
            />
          ))}
    </div>
  )
}

export default WorkflowDrawerListItem
