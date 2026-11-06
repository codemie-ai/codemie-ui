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

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import ToolSvg from '@/assets/icons/tool.svg?react'
import StatusBadge from '@/components/StatusBadge'
import StatusIndicator, { StatusEnum, StatusType } from '@/components/StatusIndicator'
import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

export type ThoughtStatus = { status: StatusType; label: string }

// Neutral status for steps suspended behind a live pause; only ever applied through an override
export const WAITING_THOUGHT_STATUS: ThoughtStatus = {
  status: StatusEnum.NotStarted,
  label: 'Waiting',
}

const getThoughtStatus = (thought: Thought, isInProgress?: boolean): ThoughtStatus => {
  if (isInProgress) return { status: StatusEnum.InProgress, label: 'In Progress' }
  if (thought.interrupted) return { status: StatusEnum.Pending, label: 'Interrupted' }
  if (thought.aborted) return { status: StatusEnum.Warning, label: 'Aborted' }
  if (thought.error) return { status: StatusEnum.Error, label: 'Failed' }
  return { status: StatusEnum.Success, label: 'Success' }
}

interface ThoughtStatusProps {
  thought: Thought
  isInProgress?: boolean
  isEmbedded?: boolean
  override?: ThoughtStatus
}

const ThoughtStatusView: FC<ThoughtStatusProps> = ({
  thought,
  isInProgress,
  isEmbedded,
  override,
}) => {
  const { status, label } = override ?? getThoughtStatus(thought, isInProgress)
  return (
    <>
      {!isEmbedded && (
        <div aria-hidden="true" className="min-h-4 h-4">
          <StatusIndicator status={status} naked={true} />
        </div>
      )}
      <div aria-hidden="true" className="ml-auto flex-shrink-0">
        <StatusBadge status={status} text={label} />
      </div>
    </>
  )
}

interface ThoughtHeaderProps {
  isExpanded?: boolean
  isInProgress?: boolean
  isEmbedded?: boolean
  setIsExpanded: (isExpanded: boolean) => void
  thought: Thought
  headerBadge?: ReactNode
  status?: ThoughtStatus
}

const ThoughtHeader: FC<ThoughtHeaderProps> = ({
  thought,
  isExpanded,
  isInProgress,
  isEmbedded,
  setIsExpanded,
  headerBadge,
  status,
}) => {
  const AuthorIcon = thought.author_type === ThoughtAuthorType.Assistant ? AssistantSvg : ToolSvg
  const toolName = thought.author_name?.trim() ?? thought.tool_name?.trim() ?? 'Tool'
  const routedModelLabel =
    thought.routing?.routed_model_label || thought.routing?.routed_model || null

  return (
    <button
      type="button"
      onClick={() => setIsExpanded(!isExpanded)}
      aria-expanded={isExpanded}
      aria-label={toolName}
      className={cn(
        'flex items-center rounded-lg shadow-sm border border-border-structural bg-surface-base-secondary gap-3 pl-4 pr-1.5 min-h-8 max-h-8 cursor-pointer hover:bg-border-structural/50 transition',
        (isExpanded || isInProgress) && 'bg-surface-base-secondary/75 rounded-b-none'
      )}
    >
      {!isInProgress && (
        <ChevronRightSvg
          aria-hidden="true"
          className={cn('size-4 min-w-4 transition duration-200', isExpanded && 'rotate-90')}
        />
      )}

      {!isEmbedded && (
        <div
          aria-hidden="true"
          className="flex items-center justify-center min-w-[1.5rem] w-[1.5rem] h-[1.5rem] rounded"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={thought.author_type}
        >
          <AuthorIcon />
        </div>
      )}

      <div aria-hidden="true" className="truncate font-medium text-sm select-none">
        {toolName}
        {routedModelLabel && (
          <span className="text-text-quaternary text-xs ml-2">— {routedModelLabel}</span>
        )}
      </div>

      {thought.input_text && (
        <div
          aria-hidden="true"
          className="w-0 lg:flex-1 text-text-quaternary text-xs py-1 text-left truncate"
          title={thought.input_text}
        >
          {thought.input_text}
        </div>
      )}

      {headerBadge}
      <ThoughtStatusView
        thought={thought}
        isInProgress={isInProgress}
        isEmbedded={isEmbedded}
        override={status}
      />
    </button>
  )
}

export default ThoughtHeader
