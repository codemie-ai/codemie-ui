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

import AssistantSvg from '@/assets/icons/assistant-alt.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import ToolSvg from '@/assets/icons/tool.svg?react'
import StatusBadge from '@/components/StatusBadge'
import StatusIndicator, { StatusEnum } from '@/components/StatusIndicator'
import { Thought, ThoughtAuthorType } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

interface ThoughtHeaderProps {
  isExpanded?: boolean
  isInProgress?: boolean
  isEmbedded?: boolean
  setIsExpanded: (isExpanded: boolean) => void
  thought: Thought
}

const ThoughtHeader: FC<ThoughtHeaderProps> = ({
  thought,
  isExpanded,
  isInProgress,
  isEmbedded,
  setIsExpanded,
}) => {
  const AuthorIcon = thought.author_type === ThoughtAuthorType.Assistant ? AssistantSvg : ToolSvg
  const toolName = thought.author_name?.trim() ?? thought.tool_name?.trim() ?? 'Tool'

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
      </div>

      {!isEmbedded && (
        <div aria-hidden="true" className="min-h-4">
          {isInProgress && <StatusIndicator status={StatusEnum.InProgress} naked={true} />}
          {!isInProgress && thought.error && (
            <StatusIndicator status={StatusEnum.Error} naked={true} />
          )}
          {!isInProgress && !thought.error && (
            <StatusIndicator status={StatusEnum.Success} naked={true} />
          )}
        </div>
      )}

      {thought.input_text && (
        <div
          aria-hidden="true"
          className="w-0 lg:flex-1 text-text-quaternary text-xs py-1 text-left truncate"
          title={thought.input_text}
        >
          {thought.input_text}
        </div>
      )}

      <div aria-hidden="true" className="ml-auto flex-shrink-0">
        {isInProgress && <StatusBadge status={StatusEnum.InProgress} text="In Progress" />}
        {!isInProgress &&
          (thought.error ? (
            <StatusBadge status={StatusEnum.Error} text="Failed" />
          ) : (
            <StatusBadge status={StatusEnum.Success} text="Success" />
          ))}
      </div>
    </button>
  )
}

export default ThoughtHeader
