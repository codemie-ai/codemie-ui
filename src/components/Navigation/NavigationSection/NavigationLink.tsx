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
import { NavLink, useMatch, useMatches } from 'react-router'
import { useSnapshot } from 'valtio'

import ApplicationSvg from '@/assets/icons/applications.svg?react'
import AssistantSvg from '@/assets/icons/assistant.svg?react'
import ChatSvg from '@/assets/icons/chat-new.svg?react'
import KataSvg from '@/assets/icons/code-duotone.svg?react'
import DatasourceSvg from '@/assets/icons/datasource.svg?react'
import AnalyticsSvg from '@/assets/icons/diagram-duotone.svg?react'
import InfoSvg from '@/assets/icons/info-menu.svg?react'
import IntegrationSvg from '@/assets/icons/integration.svg?react'
import SkillSvg from '@/assets/icons/lightning-duotone.svg?react'
import WorkflowSvg from '@/assets/icons/workflow.svg?react'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

import { IconType } from '../constants'

const iconComponents = {
  [IconType.CHAT]: ChatSvg,
  [IconType.ASSISTANT]: AssistantSvg,
  [IconType.SKILL]: SkillSvg,
  [IconType.WORKFLOW]: WorkflowSvg,
  [IconType.DATASOURCE]: DatasourceSvg,
  [IconType.APPLICATION]: ApplicationSvg,
  [IconType.INFO]: InfoSvg,
  [IconType.INTEGRATION]: IntegrationSvg,
  [IconType.KATA]: KataSvg,
  [IconType.ANALYTICS]: AnalyticsSvg,
}

export interface NavigationLinkItem {
  label: string
  icon: IconType
  route?: string
  url?: string
  badge?: string
}

interface NavigationLinkProps {
  item: NavigationLinkItem
  isBottomSection?: boolean
}

const NavigationLink: FC<NavigationLinkProps> = ({ item, isBottomSection }) => {
  const { navigationExpanded } = useSnapshot(appInfoStore)
  const matches = useMatches()
  const isActiveRoute = useMatch(`${item.route}/*`) && matches.at(-1)?.id !== 'start-assistant-chat'

  const Icon = item.icon ? iconComponents[item.icon] : null

  return (
    <NavLink
      to={item.route ?? item.url ?? '/'}
      data-tooltip-id={!navigationExpanded ? 'react-tooltip' : undefined}
      data-tooltip-content={!navigationExpanded ? item.label : undefined}
      data-tooltip-place="right"
      className={cn(
        'flex grow rounded-lg cursor-pointer group transition-colors duration-100 px-[0.688rem] hover:bg-surface-interactive-hover bg-opacity-75 h-9',
        'items-center text-left text-nowrap justify-start text-text-tertiary text-sm hover:no-underline',
        'select-none group relative',
        'gap-4',
        isActiveRoute && 'bg-surface-interactive-hover text-text-accent',
        isBottomSection
          ? 'text-text-specific-navigation-label hover:bg-white/15 gap-5'
          : 'hover:text-text-accent',
        isBottomSection && isActiveRoute && 'bg-white/15'
      )}
    >
      {Icon && (
        <div
          className={cn(
            'min-w-4.5 flex-shrink-0 transition-colors duration-100 group-hover:text-text-accent',
            isActiveRoute ? 'text-text-accent' : 'text-text-primary'
          )}
        >
          <Icon />
        </div>
      )}

      <span
        className={cn(
          'transition-opacity duration-200 ease-in-out transform-gpu',
          navigationExpanded ? 'opacity-100' : 'opacity-0'
        )}
      >
        {item.label}
      </span>

      {item.badge && (
        <span
          className={cn(
            'absolute left-[128px] px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-accent-1 text-white leading-none',
            'transition-opacity duration-200 ease-in-out transform-gpu',
            navigationExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  )
}

export default NavigationLink
