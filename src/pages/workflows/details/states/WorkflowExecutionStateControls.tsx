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

import { FC, useEffect, useRef, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import CloseSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import ContinueWithInputPopup from './ContinueWithInputPopup'
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
  const {
    workflowId,
    executionId,
    isResuming,
    executionStatus,
    resume,
    resumeWithMessage,
    refreshOutput,
  } = useExecutionsContext()
  const [isEditOutputPopupVisible, setIsEditOutputPopupVisible] = useState(false)
  const [isContinueDropdownOpen, setIsContinueDropdownOpen] = useState(false)
  const [isContinueWithMessagePopupVisible, setIsContinueWithMessagePopupVisible] = useState(false)
  const continueDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isContinueDropdownOpen) return () => {}
    const handleClickOutside = (e: MouseEvent) => {
      if (continueDropdownRef.current && !continueDropdownRef.current.contains(e.target as Node)) {
        setIsContinueDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isContinueDropdownOpen])

  const abortWorkflow = async () => {
    if (!workflowId || !executionId) return
    await workflowExecutionsStore.abortWorkflowExecution(workflowId, executionId)
    toaster.info('Workflow execution aborted')
  }

  const resumeWorkflow = async () => {
    resume()
  }

  const openContinueWithMessagePopup = () => {
    setIsContinueDropdownOpen(false)
    setIsContinueWithMessagePopupVisible(true)
  }

  const closeContinueWithMessagePopup = () => {
    setIsContinueWithMessagePopupVisible(false)
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

        <div ref={continueDropdownRef} className="relative flex">
          <Button
            variant={ButtonType.PRIMARY}
            onClick={resumeWorkflow}
            disabled={disabled}
            className={cn(buttonClassname, 'rounded-r-none')}
          >
            <PlaySvg className={iconClassname} />
            {!small && 'Continue'}
          </Button>
          <span className="self-stretch w-px bg-white/20" />
          <Button
            variant={ButtonType.PRIMARY}
            disabled={disabled}
            className={cn(buttonClassname, 'rounded-l-none px-2')}
            onClick={() => setIsContinueDropdownOpen((prev) => !prev)}
            aria-label="Continue options"
          >
            <ChevronDownSvg className="size-3.5" />
          </Button>
          {isContinueDropdownOpen && (
            <div className="absolute top-full right-0 mt-1 z-10 bg-surface-base-secondary py-1 rounded-md shadow-md px-1 min-w-max">
              <button
                className="flex w-full text-left text-sm px-2 py-2 rounded-md hover:bg-surface-specific-dropdown-hover hover:text-text-accent"
                onClick={openContinueWithMessagePopup}
              >
                Continue with message
              </button>
            </div>
          )}
        </div>
      </div>

      {workflowId && executionId && stateId && (
        <ContinueWithInputPopup
          visible={isContinueWithMessagePopupVisible}
          stateId={stateId}
          workflowId={workflowId}
          executionId={executionId}
          onHide={closeContinueWithMessagePopup}
          onContinue={(message, fileNames) => {
            resumeWithMessage(message, fileNames)
            closeContinueWithMessagePopup()
          }}
          isSubmitting={isResuming}
        />
      )}

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
