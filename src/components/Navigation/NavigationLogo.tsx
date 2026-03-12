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

import LogoFullDarkSvg from '@/assets/images/logo-full-dark.svg?react'
import LogoFullLightSvg from '@/assets/images/logo-full-light.svg?react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

interface NavigationLogoProps {
  isExpanded: boolean
  onClick: () => void
}

const NavigationLogo: React.FC<NavigationLogoProps> = ({ isExpanded, onClick }) => {
  const { isDark } = useTheme()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick()
  }

  return (
    <a
      href="#"
      aria-label="EPAM AI/Run Codemie logo"
      onClick={handleClick}
      data-tooltip-id={!isExpanded ? 'react-tooltip' : undefined}
      data-tooltip-content={!isExpanded ? 'EPAM AI/Run' : undefined}
      data-tooltip-place="right"
      className={cn(
        'h-12 flex grow gap-4 ml-0.5 items-center relative select-none text-nowrap cursor-pointer hover:no-underline group overflow-hidden'
      )}
    >
      <div
        className={cn(
          'h-[40px] overflow-hidden transition-all duration-100 ease-in-out flex-shrink-0',
          isExpanded ? 'w-[156px]' : 'w-[39px]'
        )}
      >
        {isDark ? (
          <LogoFullDarkSvg className="h-[40px] w-[156px]" />
        ) : (
          <LogoFullLightSvg className="h-[40px] w-[156px]" />
        )}
      </div>
    </a>
  )
}

export default NavigationLogo
