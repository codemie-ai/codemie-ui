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

import { FC } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import StatusBadge from '@/components/StatusBadge'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { WorkflowExecution } from '@/types/entity/workflow'
import { copyToClipboard, createdBy, formatDate } from '@/utils/utils'

import WorkflowExecutionDetailsItem from './WorkflowExecutionDetailsItem'

interface WorkflowExecutionDetailsProps {
  execution: WorkflowExecution
}

const WorkflowExecutionDetails: FC<WorkflowExecutionDetailsProps> = ({ execution }) => {
  const handleCopyId = () => {
    copyToClipboard(execution.execution_id, 'ID copied to clipboard')
  }

  return (
    <div className="flex gap-6 pb-2">
      <WorkflowExecutionDetailsItem label="Status:">
        <StatusBadge
          text={execution.overall_status}
          status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]}
        />
      </WorkflowExecutionDetailsItem>

      <WorkflowExecutionDetailsItem label="Triggered by:" value={createdBy(execution.created_by)} />
      <WorkflowExecutionDetailsItem label="Started:" value={formatDate(execution.date)} />
      <WorkflowExecutionDetailsItem label="Updated:" value={formatDate(execution.update_date)} />

      <WorkflowExecutionDetailsItem label="ID:">
        <p className="inline mr-2 break-all">{execution.execution_id}</p>
        <button onClick={handleCopyId} className="inline transition hover:opacity-80 align-middle">
          <CopySvg className="size-4 mb-px opacity-80" />
        </button>
      </WorkflowExecutionDetailsItem>
    </div>
  )
}

export default WorkflowExecutionDetails
