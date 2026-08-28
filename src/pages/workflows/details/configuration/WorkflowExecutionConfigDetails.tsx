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

import { FC, useLayoutEffect, useRef, useState } from 'react'


import ConfigureSvg from '@/assets/icons/configure.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import { ButtonSize } from '@/constants'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { Workflow } from '@/types/entity/workflow'
import { canEdit } from '@/utils/entity'
import { cn, copyToClipboard } from '@/utils/utils'

interface WorkflowExecutionConfigDetailsProps {
  workflow: Workflow
  onConfigureClick: () => void
}

const WorkflowExecutionConfigDetails: FC<WorkflowExecutionConfigDetailsProps> = ({
  workflow,
  onConfigureClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const isNameTruncated = useIsTruncated(nameRef)
  const descRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = descRef.current
    if (!el) return
    setIsOverflowing(el.scrollHeight > el.clientHeight)
  }, [workflow.description])

  const handleCopyId = () => {
    copyToClipboard(workflow.id, 'Workflow ID copied')
  }

  return (
    <div className="flex flex-col gap-4 bg-surface-base-secondary rounded-lg border border-border-primary shadow-block p-4">
      <div className="flex gap-3">
        <Avatar iconUrl={workflow.icon_url} name={workflow.name} type={AvatarType.CHAT} />

        <div className="flex flex-col mt-2 gap-1 min-w-0">
          <h4
            ref={nameRef}
            className="font-medium truncate"
            data-tooltip-id="react-tooltip"
            data-tooltip-content={isNameTruncated ? workflow.name : ''}
          >
            {workflow.name}
          </h4>

          <div className="flex gap-1 items-center text-xs">
            <p
              className="truncate"
              data-tooltip-id="react-tooltip"
              data-tooltip-content={workflow.id}
            >
              ID: {workflow.id}
            </p>
            <Button type="tertiary" onClick={handleCopyId}>
              <CopySvg className="h-3" />
            </Button>
          </div>
        </div>
      </div>

      {workflow.description && (
        <div className="flex flex-col gap-1">
          <p
            ref={descRef}
            className={cn(
              'text-sm text-text-quaternary break-words whitespace-pre-wrap',
              !isExpanded && 'line-clamp-4'
            )}
            data-testid="workflow-description"
          >
            {workflow.description}
          </p>

          {(isOverflowing || isExpanded) && (
            <button
              type="button"
              className="self-start text-xs text-text-link cursor-pointer hover:underline focus-visible:outline-none"
              data-testid="description-toggle"
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {canEdit(workflow) && (
        <Button
          type="secondary"
          className="w-full"
          size={ButtonSize.MEDIUM}
          onClick={onConfigureClick}
        >
          <ConfigureSvg />
          Configure
        </Button>
      )}
    </div>
  )
}

export default WorkflowExecutionConfigDetails
