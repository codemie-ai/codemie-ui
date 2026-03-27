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
import DownloadSvg from '@/assets/icons/download.svg?react'
import RunSvg from '@/assets/icons/run.svg?react'
import Button from '@/components/Button'
import DataOverlayButton from '@/components/DataOverlayButton/DataOverlayButton'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecution, WorkflowExecutionTokensUsage } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

import WorkflowExecutionExportPopup from './WorkflowExecutionExportPopup'
import WorkflowStartExecutionPopup from '../WorkflowStartExecutionPopup'

type ActivePopup = 'export' | 'run'
interface WorkflowExecutionActionsProps {
  workflowId: string
  execution: WorkflowExecution
}

const WorkflowExecutionActions: FC<WorkflowExecutionActionsProps> = ({ workflowId, execution }) => {
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null)
  const hidePopup = () => setActivePopup(null)

  const canAbort = !WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)
  const initialFiles = execution.file_names?.length
    ? execution.file_names
    : [execution.file_name].filter((f): f is string => f !== null)

  const handleAbort = async () => {
    await workflowExecutionsStore.abortWorkflowExecution(workflowId, execution.execution_id)
    toaster.info('Workflow execution aborted')
  }

  return (
    <>
      <div className="flex justify-center ml-auto gap-3">
        {canAbort && (
          <Button type="delete" onClick={handleAbort}>
            <CloseSvg className="w-5 h-5" />
            Abort
          </Button>
        )}

        <DataOverlayButton
          title="Usage details"
          data={async () => execution.tokens_usage ?? ({} as WorkflowExecutionTokensUsage)}
          render={(data) => ({
            'Input tokens': data.input_tokens ?? 0,
            'Output tokens': data.output_tokens ?? 0,
            'Money spent ': `$${data.money_spent?.toFixed(4) ?? 0}`,
          })}
        />

        <Button
          type="secondary"
          onClick={() => setActivePopup('export')}
          data-tooltip-id="react-tooltip"
          data-tooltip-content="Export as .md or .html"
        >
          <DownloadSvg />
        </Button>

        <Button type="primary" onClick={() => setActivePopup('run')}>
          <RunSvg />
          Rerun workflow
        </Button>
      </div>

      <WorkflowExecutionExportPopup isVisible={activePopup === 'export'} onHide={hidePopup} />
      <WorkflowStartExecutionPopup
        workflowId={workflowId}
        initialPrompt={execution.prompt}
        initialFiles={initialFiles}
        isVisible={activePopup === 'run'}
        onHide={hidePopup}
      />
    </>
  )
}

export default WorkflowExecutionActions
