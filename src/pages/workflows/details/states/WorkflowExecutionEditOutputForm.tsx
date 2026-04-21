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

import { FC, useCallback } from 'react'

import EditOutputForm from '@/components/EditOutputForm/EditOutputForm'
import { workflowExecutionsStore } from '@/store/workflowExecutions'

interface WorkflowExecutionEditOutputFormProps {
  workflowId: string
  executionId: string
  stateId: string
  onCancel: () => void
  onUpdate: () => void
}

const WorkflowExecutionEditOutputForm: FC<WorkflowExecutionEditOutputFormProps> = ({
  workflowId,
  executionId,
  stateId,
  onCancel,
  onUpdate,
}) => {
  const fetchOutput = useCallback(async () => {
    return workflowExecutionsStore.getWorkflowExecutionStateOutput(workflowId, executionId, stateId)
  }, [workflowId, executionId, stateId])

  const updateOutput = useCallback(
    async (output: string) => {
      return workflowExecutionsStore.updateWorkflowExecutionStateOutput(
        workflowId,
        executionId,
        stateId,
        output
      )
    },
    [workflowId, executionId, stateId]
  )

  return (
    <EditOutputForm
      fetchOutput={fetchOutput}
      updateOutput={updateOutput}
      onCancel={onCancel}
      onUpdate={onUpdate}
    />
  )
}

export default WorkflowExecutionEditOutputForm
