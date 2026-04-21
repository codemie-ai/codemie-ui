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

import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import Spinner from '@/components/Spinner'
import WorkflowDrawerWrapper from '@/pages/workflows/details/WorkflowDrawer/WorkflowDrawerWrapper'
import {
  type WorkflowExecutionState as WorkflowExecutionStateType,
  GroupedWorkflowExecutionState,
} from '@/types/entity'
import { START_NODE_ID } from '@/utils/workflowEditor/constants'

import WorkflowDrawerHeader from './WorkflowDrawerHeader/WorkflowDrawerHeader'
import WorkflowDrawerList from './WorkflowDrawerList/WorkflowDrawerList'
import WorkflowDrawerState from './WorkflowDrawerState/WorkflowDrawerState'
import RunChatButton from '../../components/RunChatButton'
import RunWorkflowButton from '../../components/RunWorkflowButton'
import useExecutionsContext from '../hooks/useExecutionsContext'

interface WorkflowDrawerProps {
  expanded: boolean
  onExpandedChange: (isExpanded: boolean) => void

  stateId: string | null
  state?: WorkflowExecutionStateType | null
  onSelectedStateIdChange: (stateId: string) => void

  isLoading: boolean
  refreshOutputKey: number
  states: GroupedWorkflowExecutionState[] | null
  executionPrompt?: string | null
}

export type WorkflowDrawerPopupId = 'transition' | 'call-history'

const WorkflowDrawer = ({
  expanded,
  onExpandedChange,
  isLoading,
  refreshOutputKey,
  states,
  stateId,
  executionPrompt,
  state,
  onSelectedStateIdChange,
}: WorkflowDrawerProps) => {
  const { workflowId, executionStatus } = useExecutionsContext()

  const isStartStateSelected = stateId === START_NODE_ID
  const input = (isStartStateSelected ? executionPrompt : state?.task) || '<empty prompt>'

  return (
    <WorkflowDrawerWrapper
      expanded={expanded}
      onExpandedChange={onExpandedChange}
      header={<WorkflowDrawerHeader state={state} showActions={!isStartStateSelected} />}
    >
      {isLoading && executionStatus !== 'In Progress' && states && (
        <Spinner inline className="mx-auto" rootClassName="w-full" />
      )}

      {((!isLoading && !!states?.length) || (executionStatus === 'In Progress' && states)) && (
        <>
          <WorkflowDrawerList
            states={states}
            stateId={stateId}
            onSelectedStateIdChange={onSelectedStateIdChange}
          />

          <WorkflowDrawerState
            stateId={state?.id}
            stateName={state?.name}
            input={input}
            showOutput={!isStartStateSelected && !!state}
            stateUpdatedDate={state?.update_date ?? ''}
            stateCompletedDate={state?.completed_at ?? ''}
            refreshKey={refreshOutputKey}
          />
        </>
      )}

      {!isLoading && !states?.length && executionStatus !== 'In Progress' && (
        <div className="flex flex-col items-center justify-center grow gap-6 px-8 py-6 text-center">
          {/* Text Content */}
          <div className="flex flex-col items-center gap-3 max-w-lg">
            <div className="flex flex-col items-center justify-center gap-4 text-lg font-semibold">
              <WorkflowSvg className="w-8 h-8 text-primary" />
              <h3>You don&apos;t have any executions yet</h3>
            </div>
            <p className="text-sm text-text-tertiary leading-relaxed max-w-sm">
              Start workflow to see execution states, transitions, and detailed outputs appear on
              this page.
            </p>
          </div>

          {/* Action Buttons */}
          {workflowId && (
            <div className="flex gap-4">
              <RunChatButton workflowId={workflowId} />
              <RunWorkflowButton workflowId={workflowId} />
            </div>
          )}
        </div>
      )}
    </WorkflowDrawerWrapper>
  )
}

export default WorkflowDrawer
