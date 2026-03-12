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

import React, { useState, useId } from 'react'

import InfoSvg from '@/assets/icons/info.svg?react'
import { cn } from '@/utils/utils'

interface TooltipButtonProps {
  content: string
  className?: string
  iconClassName?: string
  wrapperClassName?: string
}

const TooltipButton: React.FC<TooltipButtonProps> = ({
  content,
  className,
  iconClassName,
  wrapperClassName,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const descriptionId = useId()

  const handleClick = () => {
    setIsExpanded((prev) => !prev)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false)
    }
  }

  return (
    <div className={cn('inline-block relative', className)}>
      <button
        type="button"
        aria-label="More information"
        aria-expanded={isExpanded}
        aria-describedby={isExpanded ? descriptionId : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={content}
        data-tooltip-variant="info"
        className={cn('flex items-center opacity-60 hover:opacity-80 transition', wrapperClassName)}
      >
        <InfoSvg className={iconClassName} aria-hidden="true" />
      </button>

      <div id={descriptionId} role="status" className="sr-only" aria-hidden={isExpanded}>
        {content}
      </div>
    </div>
  )
}

export default TooltipButton
