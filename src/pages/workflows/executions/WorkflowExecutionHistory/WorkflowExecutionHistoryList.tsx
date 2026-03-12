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

import { useState, useCallback, FC, memo } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import { useVueRouter } from '@/hooks/useVueRouter'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionHistoryItem from './WorkflowExecutionHistoryItem'

interface WorkflowExecutionHistoryListProps {
  title: string
  executionId?: string
  executions: WorkflowExecution[]
}

const WorkflowExecutionHistoryList: FC<WorkflowExecutionHistoryListProps> = memo(
  ({ title, executionId, executions }) => {
    const router = useVueRouter()
    const [isPopupVisible, setIsPopupVisible] = useState(false)
    const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)

    const handleConfirmRemove = useCallback(async () => {
      const selectedExecution = executions.find((exec) => exec.execution_id === selectedExecutionId)
      if (!selectedExecution) return

      await workflowExecutionsStore.deleteWorkflowExecution(
        selectedExecution.workflow_id,
        selectedExecution.execution_id
      )

      setIsPopupVisible(false)
      setSelectedExecutionId(null)

      if (selectedExecution.execution_id !== executionId) return
      if (!executions.length || executions.length === 1) {
        router.push({ name: 'workflows' })
        return
      }

      router.replace({
        name: 'workflow-execution',
        params: {
          workflowId: executions[0].workflow_id,
          executionId: executions[0].execution_id,
        },
      })
    }, [executions, selectedExecutionId, executionId])

    const handleRemove = useCallback((executionId: string) => {
      setIsPopupVisible(true)
      setSelectedExecutionId(executionId)
    }, [])

    if (executions.length === 0) return null

    return (
      <div>
        <h3 className="text-xs text-text-quaternary uppercase mb-2 pl-2">{title}</h3>
        <div className="flex flex-col gap-2">
          {executions.map((execution) => (
            <WorkflowExecutionHistoryItem
              key={execution.execution_id}
              execution={execution}
              isActive={executionId === execution.execution_id}
              onRemove={() => handleRemove(execution.execution_id)}
            />
          ))}
        </div>

        <ConfirmationModal
          header="Confirm Deletion"
          message="Are you sure you want to delete this execution?"
          visible={isPopupVisible}
          onConfirm={handleConfirmRemove}
          onCancel={() => {
            setIsPopupVisible(false)
          }}
        />
      </div>
    )
  }
)

WorkflowExecutionHistoryList.displayName = 'WorkflowExecutionHistoryList'

export default WorkflowExecutionHistoryList
