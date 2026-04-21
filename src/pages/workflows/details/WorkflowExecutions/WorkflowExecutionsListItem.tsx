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

import React from 'react'

import ChatBubblesSVG from '@/assets/icons/chat.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import StatusBadge from '@/components/StatusBadge'
import { WORKFLOW_FINAL_STATUSES } from '@/constants/workflows'
import { useVueRouter } from '@/hooks/useVueRouter'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { ExtendedWorkflowExecution } from '@/types/entity/workflow'
import { formatDateTime } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import { computeTimeDifference } from '../../utils/computeTimeDifference'

interface WorkflowExecutionsListItemProps {
  isActive: boolean
  execution: ExtendedWorkflowExecution
  onRemove: () => void
}

const WorkflowExecutionsListItem: React.FC<WorkflowExecutionsListItemProps> = ({
  isActive,
  execution,
  onRemove,
}) => {
  const router = useVueRouter()

  const handleClick = () => {
    router.replace({
      name: 'workflow-execution',
      params: {
        workflowId: execution.workflow_id,
        executionId: execution.execution_id,
      },
    })
  }

  const startedAt = execution.date
  const updatedAt = execution.update_date

  return (
    <div
      className={cn(
        'relative w-full hover:bg-surface-specific-dropdown-hover rounded-xl cursor-pointer transition text-text-quaternary hover:text-text-primary',
        isActive && 'bg-surface-specific-dropdown-hover/60 text-text-primary'
      )}
    >
      <NavigationMore
        hideOnClickInside
        className="absolute right-1 top-1"
        buttonClassName="hover:bg-surface-base-secondary"
        items={[
          {
            title: 'Remove',
            icon: <DeleteSvg />,
            onClick: onRemove,
            disabled: !!execution.conversation_id,
            tooltip: execution.conversation_id
              ? "This execution is part of a Chat and can't be deleted from this interface"
              : undefined,
          },
        ]}
      />

      <button onClick={handleClick} className="w-full p-3 pt-1 pr-1">
        <div className="flex items-center justify-between gap-1 py-2">
          <div className="flex items-center gap-2">
            <StatusBadge
              text={execution.overall_status}
              status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]}
            />
            {execution.conversation_id && (
              <ChatBubblesSVG className="w-4 h-4 text-text-quaternary flex-shrink-0" />
            )}
          </div>

          <div className="flex gap-1 items-center">
            <div className="text-xs text-text-tertiary font-semibold mr-10 mt-0.5">
              {String(execution.index ?? 0).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-xs flex flex-col text-left gap-1">
            <div>
              <span className="text-text-tertiary">Started: </span>
              {startedAt ? formatDateTime(startedAt) : '-'}
            </div>
            <div>
              <span className="text-text-tertiary">
                {WORKFLOW_FINAL_STATUSES.includes(execution.overall_status)
                  ? `Finished: `
                  : `Updated: `}
              </span>
              {formatDateTime(updatedAt)}
            </div>
            <div>
              <span className="text-text-tertiary">Runtime: </span>
              {startedAt && updatedAt ? computeTimeDifference(startedAt, updatedAt) : '-'}
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

export default WorkflowExecutionsListItem
