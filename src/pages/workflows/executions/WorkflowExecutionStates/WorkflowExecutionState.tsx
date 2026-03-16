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

import { useRef, useImperativeHandle, forwardRef } from 'react'

import ChevronDown from '@/assets/icons/chevron-down-alt.svg?react'
import ChevronUp from '@/assets/icons/chevron-up-alt.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import Button from '@/components/Button'
import StatusIndicator from '@/components/StatusIndicator'
import { ThoughtRef } from '@/components/Thought/Thought'
import { ButtonType } from '@/constants'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import {
  WorkflowExecutionStatus,
  type WorkflowExecutionState as WorkflowExecutionStateType,
} from '@/types/entity/workflow'
import { formatDate } from '@/utils/utils'

import WorkflowExecutionStateControls from './WorkflowExecutionStateControls'
import WorkflowExecutionStateThought from './WorkflowExecutionStateThought'

interface WorkflowExecutionStateProps {
  state: WorkflowExecutionStateType
  executionStatus: WorkflowExecutionStatus
  isExpanded: boolean
  isInterruptPoint: boolean
  workflowId: string
  executionId: string
  onExpand: (stateId: string) => void
  onCollapse: (stateId: string) => void
  onViewDetails: (stateId: string) => void
  onRefreshThoughts: (thoughtIds: string[]) => void
}

export interface WorkflowExecutionStateRef {
  expandThoughts: () => void
  collapseThoughts: () => void
}

const WorkflowExecutionState = forwardRef<WorkflowExecutionStateRef, WorkflowExecutionStateProps>(
  (
    {
      state,
      executionStatus,
      isExpanded,
      isInterruptPoint,
      workflowId,
      executionId,
      onExpand,
      onCollapse,
      onViewDetails,
      onRefreshThoughts,
    },
    ref
  ) => {
    const thoughtRefs = useRef<Map<string, ThoughtRef>>(new Map())

    useImperativeHandle(ref, () => ({
      expandThoughts: () => {
        thoughtRefs.current.forEach((ref) => ref.expand())
      },
      collapseThoughts: () => {
        thoughtRefs.current.forEach((ref) => ref.collapse())
      },
    }))

    const toggleExpand = () => {
      if (isExpanded) onCollapse(state.id)
      else onExpand(state.id)
    }

    const handleRefresh = () => {
      const thoughtIds = state.thoughts.map(({ id }) => id)
      onRefreshThoughts(thoughtIds)
    }

    const canExpand = !!state.thoughts.length

    return (
      <div className="flex flex-col justify-between text-sm text-text-quaternary bg-surface-base-chat shadow-block rounded-lg p-5 border-1 border-border-primary">
        <div className="flex flex-row gap-5">
          <StatusIndicator status={WORKFLOW_STATUS_BADGE_MAPPING[state.status]} />

          <div className="grow break-words w-0">
            State name: {state.name} <br />
            Task: {state.task ?? '-'}
            <div className="mt-5">
              Started: {formatDate(state.started_at)} <br />
              Completed: {formatDate(state.completed_at)}
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center">
                Output:
                <Button variant={ButtonType.TERTIARY} onClick={() => onViewDetails(state.id)}>
                  <OpenSvg /> Open
                </Button>
              </div>

              {isInterruptPoint && (
                <WorkflowExecutionStateControls
                  executionStatus={executionStatus}
                  workflowId={workflowId}
                  executionId={executionId}
                  stateId={state.id}
                  onRefresh={handleRefresh}
                  className={canExpand ? '-mr-14' : ''}
                />
              )}
            </div>
          </div>

          {canExpand && (
            <Button variant={ButtonType.TERTIARY} onClick={toggleExpand}>
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="grow mt-4">
            {state.thoughts.map((thought) => (
              <WorkflowExecutionStateThought
                key={thought.id}
                ref={(el) => {
                  if (el) {
                    thoughtRefs.current.set(thought.id, el)
                  } else {
                    thoughtRefs.current.delete(thought.id)
                  }
                }}
                thought={workflowExecutionsStore.getStateThought(thought.id)!}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

export default WorkflowExecutionState
