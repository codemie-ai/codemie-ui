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

import Spinner from '@/components/Spinner'
import WorkflowExecutionStateThought from '@/pages/workflows/details/states/WorkflowExecutionStateThought'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecutionState } from '@/types/entity'

interface WorkflowStateCallHistoryProps {
  workflowId: string
  state: WorkflowExecutionState
}

const WorkflowStateCallHistory = ({ workflowId, state }: WorkflowStateCallHistoryProps) => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadThoughts = async () => {
      if (!state.thoughts.length) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const thoughtIds = state.thoughts.map((thought) => thought.id)
      await workflowExecutionsStore.loadWorkflowExecutionOutput(
        workflowId,
        state.execution_id,
        thoughtIds
      )
      setIsLoading(false)
    }

    loadThoughts()
  }, [workflowId, state.execution_id, state.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner inline />
      </div>
    )
  }

  if (!state.thoughts.length) {
    return (
      <div className="flex items-center justify-center p-8 text-text-quaternary">
        No call history available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 mb-4">
      {state.thoughts.map((thought) => {
        const thoughtData = workflowExecutionsStore.getStateThought(thought.id)
        if (!thoughtData) return null
        return (
          <WorkflowExecutionStateThought defaultExpanded key={thought.id} thought={thoughtData} />
        )
      })}
    </div>
  )
}

export default WorkflowStateCallHistory
