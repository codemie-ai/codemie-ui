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

import React, { useState } from 'react'

import CloseSvg from '@/assets/icons/cross.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecution } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

import WorkflowExecutionInfoPopup from './WorkflowExecutionInfoPopup'
import RunChatButton from '../components/RunChatButton'
import RunWorkflowButton from '../components/RunWorkflowButton'
import WorkflowExecutionExportPopup from './popups/WorkflowExecutionExportPopup'

interface Workflow {
  id: number | string
  name: string
  icon_url?: string
  created_by?: {
    name?: string
    username?: string
    user_id?: string
    id?: string
  }
  shared?: boolean
  [key: string]: any
}

interface WorkflowExecutionHeaderProps {
  workflow: Workflow | null
  execution: WorkflowExecution | null
}

const WorkflowExecutionHeader: React.FC<WorkflowExecutionHeaderProps> = ({
  workflow,
  execution,
}) => {
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [showExportPopup, setShowExportPopup] = useState(false)

  if (!workflow) return null

  const canAbort = execution && !WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)

  const handleAbort = async () => {
    if (!execution) return
    await workflowExecutionsStore.abortWorkflowExecution(
      String(workflow.id),
      execution.execution_id
    )
    toaster.info('Workflow execution aborted')
  }

  return (
    <>
      <div className="flex flex-row gap-2 px-6 py-3 border-b border-border-structural items-center justify-end">
        {canAbort && (
          <Button variant={ButtonType.DELETE} onClick={handleAbort}>
            <CloseSvg className="w-5 h-5" />
            Abort
          </Button>
        )}
        {execution && (
          <Button variant={ButtonType.SECONDARY} onClick={() => setShowInfoPopup(true)}>
            <InfoSvg className="w-4 h-4" />
            Info
          </Button>
        )}
        {execution && (
          <Button
            variant={ButtonType.SECONDARY}
            onClick={() => setShowExportPopup(true)}
            data-tooltip-id="react-tooltip"
            data-tooltip-content="Export as .md or .html"
          >
            <DownloadSvg />
          </Button>
        )}
        <RunChatButton workflowId={String(workflow.id)} />
        <RunWorkflowButton workflowId={String(workflow.id)} replaceRoute={!execution} />
      </div>

      <WorkflowExecutionInfoPopup
        isVisible={showInfoPopup}
        onHide={() => setShowInfoPopup(false)}
        execution={execution}
      />
      <WorkflowExecutionExportPopup
        isVisible={showExportPopup}
        onHide={() => setShowExportPopup(false)}
      />
    </>
  )
}

export default WorkflowExecutionHeader
