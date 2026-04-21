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

import React, { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { ANALYTICS } from '@/constants/routes'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useTheme } from '@/hooks/useTheme'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { applicationsStore } from '@/store/applications'
import { chatsStore } from '@/store/chats'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { cn } from '@/utils/utils'

import { IconType } from './constants'
import NavigationAssistants from './NavigationAssistants'
import NavigationExpandButton from './NavigationExpandButton'
import NavigationLogo from './NavigationLogo'
import NavigationProfile from './NavigationProfile'
import { NavigationLinkItem } from './NavigationSection/NavigationLink'
import NavigationSection from './NavigationSection/NavigationSection'

interface NavigationProps {
  infoMessageVisible?: boolean
}

const Navigation: React.FC<NavigationProps> = () => {
  const router = useVueRouter()
  const { isDark } = useTheme()
  const { navigationExpanded } = useSnapshot(appInfoStore)
  const { applications } = useSnapshot(applicationsStore)

  const isExpanded = navigationExpanded

  const toggleNavigation = () => {
    appInfoStore.toggleNavigationExpanded()
  }

  const handleCreateChat = async () => {
    const chat = await chatsStore.createChat('', '', false)
    router.push({ name: 'chats', params: { id: chat.id } })
  }

  const [isSkillsEnabled] = useFeatureFlag('skills')

  const upperItems = useMemo(() => {
    const items: NavigationLinkItem[] = [
      {
        label: 'Chats',
        icon: IconType.CHAT,
        route: router.resolve({ path: '/chats' }).fullPath,
      },
      {
        label: 'Assistants',
        icon: IconType.ASSISTANT,
        route: router.resolve({ name: 'assistants' }).fullPath,
      },
    ]

    if (isSkillsEnabled) {
      items.push({
        label: 'Skills',
        icon: IconType.SKILL,
        route: router.resolve({ name: 'skills' }).fullPath,
        badge: 'NEW',
      })
    }

    items.push({
      label: 'Workflows',
      icon: IconType.WORKFLOW,
      route: router.resolve({ name: 'workflows' }).fullPath,
    })

    if (applications?.length) {
      items.push({
        label: 'Applications',
        icon: IconType.APPLICATION,
        route: router.resolve({ name: 'applications' }).fullPath,
      })
    }

    return items
  }, [router, applications, isSkillsEnabled])

  const upperSecondaryItems = useMemo(() => {
    const items: NavigationLinkItem[] = [
      {
        label: 'Integrations',
        icon: IconType.INTEGRATION,
        route: router.resolve({ name: 'integrations', query: { tab: 'integrations' } }).fullPath,
      },
      {
        label: 'Data Sources',
        icon: IconType.DATASOURCE,
        route: router.resolve({ name: 'data-sources' }).fullPath,
      },
      {
        label: 'AI Katas',
        icon: IconType.KATA,
        route: router.resolve({ name: 'katas' }).fullPath,
        badge: 'NEW',
      },
    ]

    if (isEnterpriseEdition()) {
      items.push({
        label: 'Analytics',
        icon: IconType.ANALYTICS,
        route: router.resolve({ name: ANALYTICS }).fullPath,
        badge: 'NEW',
      })
    }

    return items
  }, [router])

  const lowerItems: NavigationLinkItem[] = [
    { label: 'Help', icon: IconType.INFO, route: router.resolve({ name: 'help' }).fullPath },
  ]

  return (
    <header
      className={cn(
        'flex flex-col justify-between h-full',
        'relative px-2 pt-6 pb-4 transition-width duration-200 ease-in-out',
        'will-change-[width] transform-gpu',
        isExpanded ? 'min-w-navbar-expanded w-navbar-expanded' : 'w-navbar',
        isDark ? 'bg-gradient-to-b from-black to-black/15' : 'border-r border-border-structural'
      )}
      data-onboarding="navigation-menu"
    >
      <div className="flex flex-col px-2">
        <NavigationLogo isExpanded={isExpanded} onClick={handleCreateChat} />
        <NavigationSection items={upperItems} className="mt-4" />
        <div className="h-px my-4 bg-border-primary mx-2" />
        <NavigationSection items={upperSecondaryItems} />
      </div>

      <div className="flex flex-col gap-3">
        <nav className="flex flex-col gap-2 px-2" aria-label="bottom-nav-links">
          <NavigationAssistants isExpanded={isExpanded} />
          <div className="mt-4 mb-2 h-px bg-white/20 mx-2" />
          <NavigationSection isBottomSection items={lowerItems} />
        </nav>

        <NavigationProfile isExpanded={isExpanded} />
        <NavigationExpandButton onClick={toggleNavigation} />
      </div>
    </header>
  )
}

export default Navigation
