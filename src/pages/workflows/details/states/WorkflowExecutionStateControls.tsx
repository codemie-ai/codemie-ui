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
import { ButtonType } from '@/constants'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import WorkflowExecutionEditOutputForm from './WorkflowExecutionEditOutputForm'
import useExecutionsContext from '../hooks/useExecutionsContext'

interface WorkflowExecutionStateControlsProps {
  stateId: string | null
  className?: string
  small?: boolean
}

const WorkflowExecutionStateControls: FC<WorkflowExecutionStateControlsProps> = ({
  stateId,
  className,
  small,
}) => {
  const { workflowId, executionId, isResuming, executionStatus, resume, refreshOutput } =
    useExecutionsContext()
  const [isEditOutputPopupVisible, setIsEditOutputPopupVisible] = useState(false)

  const abortWorkflow = async () => {
    if (!workflowId || !executionId) return
    await workflowExecutionsStore.abortWorkflowExecution(workflowId, executionId)
    toaster.info('Workflow execution aborted')
  }

  const resumeWorkflow = async () => {
    resume()
  }

  const closeEditOutputPopup = () => setIsEditOutputPopupVisible(false)

  const handleUpdate = () => {
    refreshOutput()
    closeEditOutputPopup()
  }

  const buttonClassname = small ? 'h-10 px-2.5 rounded-xl' : ''
  const iconClassname = small ? 'size-7' : ''

  const disabled = isResuming || executionStatus === 'In Progress'

  return (
    <>
      <div className={cn('flex gap-2', className)}>
        <Button
          variant={ButtonType.DELETE}
          onClick={abortWorkflow}
          disabled={disabled}
          className={buttonClassname}
        >
          <CloseSvg className={iconClassname} />
          {!small && 'Abort'}
        </Button>

        <Button
          variant={ButtonType.SECONDARY}
          disabled={disabled}
          className={buttonClassname}
          onClick={() => {
            setIsEditOutputPopupVisible(true)
          }}
        >
          <EditSvg className={iconClassname} />
          {!small && 'Edit'}
        </Button>

        <Button
          variant={ButtonType.PRIMARY}
          onClick={resumeWorkflow}
          disabled={disabled}
          className={buttonClassname}
        >
          <PlaySvg className={iconClassname} />
          {!small && 'Continue'}
        </Button>
      </div>

      {workflowId && executionId && stateId && (
        <Popup
          hideFooter
          header="Edit Output"
          withBorder={false}
          dismissableMask={false}
          className="w-full max-w-4xl h-full"
          bodyClassName="pb-4 px-0 pt-0"
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
      )}
    </>
  )
}

export default WorkflowExecutionStateControls
