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

import { FC, ReactNode } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Popup from '@/components/Popup'
import StatusBadge from '@/components/StatusBadge'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { WorkflowExecution } from '@/types/entity/workflow'
import { formatDateTime } from '@/utils/helpers'
import { copyToClipboard, createdBy } from '@/utils/utils'

import { computeTimeDifference } from '../utils/computeTimeDifference'

interface InfoItemProps {
  label: string
  children: ReactNode
  className?: string
}

const InfoItem: FC<InfoItemProps> = ({ label, children, className }) => {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <p className="text-text-quaternary">{label}</p>
      <div className="text-text-primary">{children}</div>
    </div>
  )
}

interface WorkflowExecutionInfoPopupProps {
  isVisible: boolean
  onHide: () => void
  execution: WorkflowExecution | null
}

const WorkflowExecutionInfoPopup: FC<WorkflowExecutionInfoPopupProps> = ({
  isVisible,
  onHide,
  execution,
}) => {
  if (!execution) return null

  const handleCopyId = () => {
    copyToClipboard(execution.execution_id, 'ID copied to clipboard')
  }

  return (
    <Popup
      header="Execution Info"
      visible={isVisible}
      onHide={onHide}
      className="w-[500px] pb-3"
      bodyClassName="pt-2"
      hideFooter
    >
      <div className="flex flex-col gap-4 py-2 text-xs">
        <InfoItem label="Status:">
          <StatusBadge
            text={execution.overall_status}
            status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]}
          />
        </InfoItem>

        <InfoItem label="Triggered by:">{createdBy(execution.created_by)}</InfoItem>

        <div className="flex gap-6">
          <InfoItem label="Started:">{formatDateTime(execution.date)}</InfoItem>
          <InfoItem
            label={
              WORKFLOW_FINAL_STATUSES.includes(execution.overall_status) ? 'Finished:' : 'Updated:'
            }
          >
            {formatDateTime(execution.update_date)}
          </InfoItem>
          <InfoItem label="Runtime:">
            {execution.date && execution.update_date
              ? computeTimeDifference(execution.date, execution.update_date)
              : '-'}
          </InfoItem>
        </div>

        <InfoItem label="ID:">
          <div className="flex items-center gap-2">
            <p className="break-all">{execution.execution_id}</p>
            <button onClick={handleCopyId} className="transition hover:opacity-80">
              <CopySvg className="size-4 opacity-80" />
            </button>
          </div>
        </InfoItem>

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Spending metrics</h4>
          <div className="flex gap-6">
            <InfoItem label="Money spent:">
              ${execution.tokens_usage?.money_spent?.toFixed(4) ?? '0.0000'}
            </InfoItem>
            <InfoItem label="Input tokens:">
              {execution.tokens_usage?.input_tokens?.toLocaleString() ?? 0}
            </InfoItem>
            <InfoItem label="Output tokens:">
              {execution.tokens_usage?.output_tokens?.toLocaleString() ?? 0}
            </InfoItem>
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default WorkflowExecutionInfoPopup
