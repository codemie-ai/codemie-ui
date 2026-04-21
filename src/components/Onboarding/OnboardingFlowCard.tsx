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

import { FC, useRef } from 'react'

import CheckSvg from '@/assets/icons/check.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { onboardingStore } from '@/store/onboarding'
import { cn } from '@/utils/utils'

export interface OnboardingFlowCardProps {
  flowId: string
  name: string
  description?: string
  duration?: string
  emoji?: string
  /** Show a completed badge */
  isCompleted?: boolean
  /** Show a right-chevron arrow */
  showChevron?: boolean
  /**
   * 'default' – full card with emoji box (Help page, OnboardingModal)
   * 'small'   – compact card with plain emoji (HelpLauncher popup)
   */
  size?: 'default' | 'small'
  /** Use a transparent background — for placing cards on gradient/coloured surfaces */
  transparent?: boolean
  /** Override the default startFlow behaviour. Called with flowId on click. */
  onStart?: (flowId: string) => void
}

const OnboardingFlowCard: FC<OnboardingFlowCardProps> = ({
  flowId,
  name,
  description,
  duration,
  emoji = '🎓',
  isCompleted,
  showChevron,
  size = 'default',
  transparent = false,
  onStart,
}) => {
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(descriptionRef)

  const isSmall = size === 'small'

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onStart) {
      onStart(flowId)
    } else {
      onboardingStore.startFlow(flowId)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center cursor-pointer select-none transition-all',
        'focus:outline-none focus:ring-2 focus:ring-border-accent',
        transparent
          ? 'border border-white/40 bg-transparent hover:bg-white/10'
          : 'border border-border-specific-panel-outline bg-surface-base-chat hover:bg-opacity-30 hover:border-border-accent',
        isSmall ? 'gap-3 p-3 rounded-lg' : 'gap-4 p-4 rounded-xl'
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e as unknown as React.MouseEvent)}
    >
      {/* Emoji */}
      <div
        className={cn(
          'flex-shrink-0 text-2xl leading-none',
          !isSmall &&
            cn(
              'flex items-center justify-center size-12 rounded-xl',
              transparent ? 'bg-white/10' : 'bg-surface-base-quateary'
            )
        )}
      >
        {emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h3 className="font-semibold text-sm text-text-primary group-hover:text-text-accent-status transition-colors truncate">
            {name}
          </h3>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs bg-success-secondary border-success-primary text-success-primary border-1 rounded-full px-2 ">
                <CheckSvg className="size-3.5 text-success-primary" />
                Completed
              </span>
            )}

            {duration && (
              <span className="text-xs text-text-secondary whitespace-nowrap">{duration}</span>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            ref={descriptionRef}
            data-tooltip-id="react-tooltip"
            data-tooltip-place="bottom"
            data-tooltip-content={isTruncated ? description : ''}
            className="text-xs text-text-secondary leading-relaxed line-clamp-2"
          >
            {description}
          </p>
        )}
      </div>

      {/* Chevron */}
      {showChevron && (
        <ChevronRightSvg className="flex-shrink-0 size-4 text-text-secondary group-hover:text-text-primary transition-colors" />
      )}
    </div>
  )
}

export default OnboardingFlowCard
