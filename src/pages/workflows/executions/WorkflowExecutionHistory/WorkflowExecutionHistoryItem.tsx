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

import { DateTime } from 'luxon'
import React from 'react'

import ChatBubblesSVG from '@/assets/icons/chat.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import StatusBadge from '@/components/StatusBadge'
import { useVueRouter } from '@/hooks/useVueRouter'
import { WORKFLOW_STATUS_BADGE_MAPPING } from '@/pages/workflows/constants'
import { WorkflowExecution } from '@/types/entity/workflow'
import { formatDateTime, parseDate, truncateInput } from '@/utils/helpers'
import { cn } from '@/utils/utils'

const TRUNCATE_THRESHOLD = 30

const isOlderThan1Day = (date: string | null): boolean => {
  if (!date) return true
  const now = DateTime.now()
  const executionDate = parseDate(date)
  return now.diff(executionDate, 'days').days > 1
}

interface WorkflowExecutionHistoryItemProps {
  isActive: boolean
  execution: WorkflowExecution
  onRemove: () => void
}

const WorkflowExecutionHistoryItem: React.FC<WorkflowExecutionHistoryItemProps> = ({
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

  const executionDate = isOlderThan1Day(execution.date)
    ? formatDateTime(execution.date)
    : formatDateTime(execution.date, 'relative')

  const executionName = execution?.prompt?.trim()?.length
    ? execution.prompt
    : execution.execution_id

  const tooltip = executionName.length > TRUNCATE_THRESHOLD ? executionName : ''

  return (
    <div
      className={cn(
        'relative w-full hover:bg-surface-specific-dropdown-hover rounded-xl cursor-pointer transition text-text-quaternary hover:text-text-primary',
        isActive && 'bg-surface-specific-dropdown-hover/60 text-text-primary'
      )}
    >
      <button onClick={handleClick} className="w-full p-3 pr-0">
        <div className="flex justify-between gap-1 mb-2 pr-6">
          <StatusBadge
            text={execution.overall_status}
            status={WORKFLOW_STATUS_BADGE_MAPPING[execution.overall_status]}
          />
          <p className="text-text-quaternary text-xs text-right">
            {execution.date && executionDate}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex truncate items-center">
            {execution.conversation_id && (
              <ChatBubblesSVG className="!w-4 !h-4 mr-1 text-text-quaternary flex-shrink-0" />
            )}
            <h4
              className="truncate text-sm"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={tooltip}
            >
              {truncateInput(executionName, TRUNCATE_THRESHOLD)}
            </h4>
          </div>
          <div className="size-7 shrink-0" />
        </div>
      </button>

      <NavigationMore
        hideOnClickInside
        buttonClassName="hover:bg-surface-base-secondary"
        className="absolute right-0 bottom-0 mr-2 mb-2"
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
    </div>
  )
}

export default WorkflowExecutionHistoryItem
