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
import { useSnapshot } from 'valtio'

import SidebarSvg from '@/assets/icons/sidebar-alt.svg?react'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

interface NavigationExpandButtonProps {
  onClick: () => void
}

const NavigationExpandButton: FC<NavigationExpandButtonProps> = ({ onClick }) => {
  const { navigationExpanded } = useSnapshot(appInfoStore)

  return (
    <button
      type="button"
      className={cn(
        'rounded-lg duration-100 mx-2 flex items-center text-text-specific-navigation-label gap-6 hover:bg-white/20',
        'px-[11px] h-9 select-none text-sm text-nowrap'
      )}
      onClick={onClick}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={!navigationExpanded ? 'Expand Menu' : undefined}
      data-tooltip-place="right"
    >
      <SidebarSvg
        className={cn('min-w-4 transition-transform text-text-inverse', {
          'rotate-180': !navigationExpanded,
        })}
      />
      {navigationExpanded ? 'Hide Menu' : ''}
    </button>
  )
}

export default NavigationExpandButton
