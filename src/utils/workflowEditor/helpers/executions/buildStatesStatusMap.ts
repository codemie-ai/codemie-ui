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

import type { ExtendedWorkflowExecutionState, WorkflowExecutionStatus } from '@/types/entity'
import type { StateConfiguration } from '@/types/workflowEditor/configuration'
import { isDecisionState } from '@/utils/workflowEditor/helpers/states'

import type { StatusMap } from './common'

// high -> low
const STATE_STATUS_PRIORITY: WorkflowExecutionStatus[] = [
  'Interrupted',
  'In Progress',
  'Aborted',
  'Failed',
  'Succeeded',
  'Not Started',
]

/**
 * Select a final status from execution states with the same state_id with specific priority
 */
export const getPriorityStatus = (statuses: WorkflowExecutionStatus[]): WorkflowExecutionStatus => {
  return statuses.reduce(
    (highest, current) =>
      STATE_STATUS_PRIORITY.indexOf(current) < STATE_STATUS_PRIORITY.indexOf(highest)
        ? current
        : highest,
    'Not Started'
  )
}

/**
 * Get status for state with type === 'Action'
 * Finds the latest execution entry for this state (last index in array)
 */
const getActionStatus = (
  configStateId: string,
  executionStates: ExtendedWorkflowExecutionState[]
): WorkflowExecutionStatus => {
  // We iterate backwards to find the most recent status (the latest index)
  for (let i = executionStates.length - 1; i >= 0; i -= 1) {
    if (executionStates[i]?.resolvedId === configStateId) {
      return executionStates[i]?.status ?? 'Not Started'
    }
  }

  return 'Not Started'
}

/**
 * Get status for state with type === 'Decision'
 */
const getDecisionStatus = (): WorkflowExecutionStatus => {
  const status: WorkflowExecutionStatus = 'Succeeded'
  return status
}

type BuildStatesStatusMapParams = {
  configStates: StateConfiguration[]
  executionStates: ExtendedWorkflowExecutionState[]
  executedStateIds: Set<string>
}

/** Builds states status map */
export const buildStatesStatusMap = ({
  configStates,
  executionStates,
  executedStateIds,
}: BuildStatesStatusMapParams): StatusMap => {
  const map: StatusMap = new Map()

  configStates.forEach((configState) => {
    if (!executedStateIds.has(configState.id)) return

    if (isDecisionState(configState)) {
      map.set(configState.id, getDecisionStatus())
    } else {
      map.set(configState.id, getActionStatus(configState.id, executionStates))
    }
  })

  return map
}
