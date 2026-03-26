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

import React, { useState, useRef, useCallback } from 'react'

import QuestionSVG from '@/assets/icons/question.svg?react'
import { DEFAULT_POPUP_TITLE, DEFAULT_POPUP_DESCRIPTION } from '@/constants/helpLinks'
import { cn } from '@/utils/utils'

import HelpPopup, { HelpLink } from './HelpPopup'

const POPUP_GAP = 8

export interface HelpLauncherProps {
  links: HelpLink[]
  tooltipText: string
  className?: string
}

const HelpLauncher: React.FC<HelpLauncherProps> = ({ links, tooltipText, className }) => {
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = useCallback(() => {
    setIsPopupVisible((prev) => !prev)
    setIsTooltipVisible(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (!isPopupVisible) {
      setIsTooltipVisible(true)
    }
  }, [isPopupVisible])

  const handleMouseLeave = useCallback(() => {
    setIsTooltipVisible(false)
  }, [])

  // Calculate position for popup
  const getPopupPositionStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return {}

    const rect = buttonRef.current.getBoundingClientRect()

    return {
      bottom: `${window.innerHeight - rect.bottom}px`,
      right: `${window.innerWidth - rect.left + POPUP_GAP}px`,
    }
  }

  // Calculate position for tooltip
  const getTooltipPositionStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return {}

    const rect = buttonRef.current.getBoundingClientRect()

    return {
      top: `${rect.top + rect.height / 2}px`,
      right: `${window.innerWidth - rect.left + POPUP_GAP}px`,
      transform: 'translateY(-50%)',
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'flex items-center justify-center',
          'w-12 h-12 p-1',
          'rounded-full',
          'transition-all duration-100',
          'help-launcher-button',
          'focus:outline-none',
          isPopupVisible && 'help-launcher-button-active',
          className
        )}
        aria-label="Help"
        type="button"
      >
        <QuestionSVG className="w-7 h-7" />
      </button>

      {/* Tooltip */}
      {isTooltipVisible && (
        <div
          className={cn(
            'fixed z-40 pointer-events-none',
            'flex items-center justify-end gap-2',
            'py-1.5 px-2 max-w-96',
            'rounded-lg',
            'bg-surface-base-quateary text-text-quaternary',
            'text-xs font-normal leading-5'
          )}
          style={getTooltipPositionStyle()}
        >
          {tooltipText}
        </div>
      )}

      {/* Help Popup */}
      {isPopupVisible && (
        <HelpPopup
          onClose={() => setIsPopupVisible(false)}
          title={DEFAULT_POPUP_TITLE}
          description={DEFAULT_POPUP_DESCRIPTION}
          links={links}
          style={getPopupPositionStyle()}
        />
      )}
    </>
  )
}

export default HelpLauncher
