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

import { FC, useEffect, useState, useMemo } from 'react'

import Markdown from '@/components/markdown/Markdown'
import TextBlock from '@/components/markdown/TextBlock'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecutionState } from '@/types/entity/workflow'

interface WorkflowExecutionStateOutputPopupProps {
  visible: boolean
  workflowId: string
  executionId: string
  state: WorkflowExecutionState
  onHide: () => void
}

const WorkflowExecutionStateOutputPopup: FC<WorkflowExecutionStateOutputPopupProps> = ({
  visible,
  workflowId,
  executionId,
  state,
  onHide,
}) => {
  const [output, setOutput] = useState<string | null>(null)

  const getStateOutput = async () => {
    if (!state?.id) return

    try {
      const result =
        (await workflowExecutionsStore.getWorkflowExecutionStateOutput(
          workflowId,
          executionId,
          state.id
        )) || ''
      setOutput(result)
    } catch (error) {
      console.error('Error fetching state output:', error)
      setOutput('')
    }
  }

  useEffect(() => {
    if (visible && state?.id) {
      getStateOutput()
    }
  }, [visible, state?.id, workflowId, executionId])

  const header = `Execution State Output for ${state?.name || ''}`

  const tabs = useMemo<Tab<'raw' | 'preview'>[]>(
    () => [
      {
        id: 'raw',
        label: 'Raw',
        element: (
          <div className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural min-w-[800px]">
            <TextBlock text={output || ''} />
          </div>
        ),
      },
      {
        id: 'preview',
        label: 'Markdown',
        element: (
          <div className="bg-surface-base-secondary p-4 rounded-lg border border-border-structural min-w-[800px]">
            <Markdown content={output || ''} />
          </div>
        ),
      },
    ],
    [output]
  )

  return (
    <Popup
      bodyClassName="max-w-5xl"
      visible={visible}
      onHide={onHide}
      header={header}
      hideFooter
      className="m-0 pb-3"
    >
      {typeof output === 'string' ? (
        <Tabs tabs={tabs} />
      ) : (
        <div className="flex mb-3 justify-center">
          <Spinner />
        </div>
      )}
    </Popup>
  )
}

export default WorkflowExecutionStateOutputPopup
