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

import { FC, useState } from 'react'

import CloseSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import WorkflowExecutionEditOutputForm from './popups/WorkflowExecutionEditOutputForm'

interface WorkflowExecutionStateControlsProps {
  executionStatus: string
  workflowId: string
  executionId: string
  stateId: string
  className?: string
  onRefresh: () => void
}

const WorkflowExecutionStateControls: FC<WorkflowExecutionStateControlsProps> = ({
  executionStatus,
  workflowId,
  executionId,
  stateId,
  className,
  onRefresh,
}) => {
  const [inProgress, setInProgress] = useState(false)
  const [isEditOutputPopupVisible, setIsEditOutputPopupVisible] = useState(false)

  const isInterrupted = executionStatus === WORKFLOW_STATUSES.INTERRUPTED

  const abortWorkflow = async () => {
    await workflowExecutionsStore.abortWorkflowExecution(workflowId, executionId)
    toaster.info('Workflow execution aborted')
  }

  const resumeWorkflow = async () => {
    setInProgress(true)
    await workflowExecutionsStore.resumeWorkflowExecution(workflowId, executionId)
    setInProgress(false)
  }

  const closeEditOutputPopup = () => setIsEditOutputPopupVisible(false)

  const handleUpdate = () => {
    onRefresh()
    closeEditOutputPopup()
  }

  if (inProgress) return <Spinner inline rootClassName={cn('pt-0 pr-2.5', className)} />
  if (!isInterrupted) return null

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button variant={ButtonType.DELETE} onClick={abortWorkflow}>
          <CloseSvg /> Cancel
        </Button>

        <Button
          variant={ButtonType.SECONDARY}
          onClick={() => {
            setIsEditOutputPopupVisible(true)
          }}
        >
          <EditSvg /> Edit
        </Button>

        <Button variant={ButtonType.PRIMARY} onClick={resumeWorkflow}>
          <PlaySvg /> Continue
        </Button>
      </div>

      <Popup
        hideFooter
        header="Edit Output"
        className="w-full max-w-2xl"
        bodyClassName="pb-4"
        visible={isEditOutputPopupVisible}
        onHide={closeEditOutputPopup}
      >
        <WorkflowExecutionEditOutputForm
          stateId={stateId}
          workflowId={workflowId}
          executionId={executionId}
          onUpdate={handleUpdate}
          onCancel={closeEditOutputPopup}
        />
      </Popup>
    </>
  )
}

export default WorkflowExecutionStateControls
