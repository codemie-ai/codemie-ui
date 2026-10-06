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

import React, { useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { MOBILE_OVERLAY_CLASS_NAME } from '@/constants/mobileLayout'
import { ANALYTICS, SCHEDULERS } from '@/constants/routes'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import {
  useFeatureFlag,
  useFavoritesEnabled,
  useFavoritesPageEnabled,
  usePinnedAssistantsEnabled,
  useSchedulersViewEnabled,
} from '@/hooks/useFeatureFlags'
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout'
import { useTheme } from '@/hooks/useTheme'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { applicationsStore } from '@/store/applications'
import { chatsStore } from '@/store/chats'
import { isNestedLayerFocused } from '@/utils/mobileOverlay'
import { cn } from '@/utils/utils'

import { IconType } from './constants'
import NavigationExpandButton from './NavigationExpandButton'
import NavigationLogo from './NavigationLogo'
import NavigationPinnedSection from './NavigationPinnedSection/NavigationPinnedSection'
import NavigationProfile from './NavigationProfile'
import { NavigationLinkItem } from './NavigationSection/NavigationLink'
import NavigationSection from './NavigationSection/NavigationSection'
import { useNavigationExpanded } from './useNavigationExpanded'

interface NavigationProps {
  infoMessageVisible?: boolean
}

const Navigation: React.FC<NavigationProps> = () => {
  const router = useVueRouter()
  const { isDark, appearance } = useTheme()
  const { mobileNavigationOpen } = useSnapshot(appInfoStore)
  const isMobileLayout = useIsMobileLayout()

  const showGradient = appearance?.gradients ?? true
  const showBorder = appearance?.navigationBorder ?? !isDark
  const { applications } = useSnapshot(applicationsStore)

  const isExpanded = useNavigationExpanded()
  const isMobileMenuOpen = isMobileLayout && mobileNavigationOpen

  // A dialog or menu opened from the menu (e.g. the profile) closes first on Escape.
  const closeMobileMenu = useCallback(() => {
    if (!isNestedLayerFocused()) appInfoStore.setMobileNavigationOpen(false)
  }, [])
  useEscapeKey(closeMobileMenu, isMobileMenuOpen)

  const toggleNavigation = () => {
    appInfoStore.toggleNavigationExpanded()
  }

  const handleCreateChat = async () => {
    await chatsStore.startNewChat('', '', false)
    router.push({ name: 'new-chat' })
  }

  const [isSkillsEnabled] = useFeatureFlag('skills')
  const [isFavoritesEnabled] = useFavoritesEnabled()
  const [isFavoritesPageEnabled] = useFavoritesPageEnabled()
  const [isPinnedAssistantsEnabled] = usePinnedAssistantsEnabled()
  const [isSchedulersViewEnabled] = useSchedulersViewEnabled()
  const [isKnowledgeBasesEnabled] = useFeatureFlag(FEATURE_FLAGS.KNOWLEDGE_BASES)
  const [isDatasourcesEnabled] = useFeatureFlag(FEATURE_FLAGS.DATASOURCES)
  const [isCodeIndexingEnabled] = useFeatureFlag(FEATURE_FLAGS.CODE_INDEXING)
  const isDataSourcesSurfaceEnabled =
    isKnowledgeBasesEnabled || isDatasourcesEnabled || isCodeIndexingEnabled
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
    ]

    if (isDataSourcesSurfaceEnabled) {
      items.push({
        label: 'Data Sources',
        icon: IconType.DATASOURCE,
        route: router.resolve({ name: 'data-sources' }).fullPath,
      })
    }

    items.push({
      label: 'AI Katas',
      icon: IconType.KATA,
      route: router.resolve({ name: 'katas' }).fullPath,
    })

    if (isSchedulersViewEnabled) {
      items.splice(2, 0, {
        label: 'Schedulers',
        icon: IconType.SCHEDULER,
        route: router.resolve({ name: SCHEDULERS }).fullPath,
        badge: 'NEW',
      })
    }

    items.push({
      label: 'Analytics',
      icon: IconType.ANALYTICS,
      route: router.resolve({ name: ANALYTICS }).fullPath,
    })

    return items
  }, [router, isSchedulersViewEnabled, isDataSourcesSurfaceEnabled])

  const favoritesItems: NavigationLinkItem[] = useMemo(
    () =>
      isFavoritesEnabled && isFavoritesPageEnabled
        ? [
            {
              label: 'Favorites',
              icon: IconType.FAVORITES,
              route: router.resolve({ path: '/favorites' }).fullPath,
            },
          ]
        : [],
    [router, isFavoritesEnabled, isFavoritesPageEnabled]
  )

  const lowerItems: NavigationLinkItem[] = [
    {
      label: 'Help',
      icon: IconType.INFO,
      route: router.resolve({ name: 'help' }).fullPath,
    },
  ]

  let backgroundClass = 'bg-surface-base-navigation'
  if (showGradient) {
    backgroundClass = isDark ? 'bg-gradient-to-b from-black to-black/15' : ''
  }

  // On mobile the navigation is the menu opened from the top bar, which also holds the logo.
  if (isMobileLayout && !mobileNavigationOpen) return null

  return (
    <header
      id="navigation-menu"
      className={cn(
        'flex flex-col',
        isMobileLayout
          ? [MOBILE_OVERLAY_CLASS_NAME, 'overflow-y-auto px-2 pt-2 pb-4 bg-surface-base-navigation']
          : [
              'h-full relative px-2 pt-6 pb-4 transition-width duration-200 ease-in-out',
              'will-change-[width] transform-gpu',
              isExpanded ? 'min-w-navbar-expanded w-navbar-expanded' : 'w-navbar',
              backgroundClass,
              showBorder && 'border-r border-border-structural',
            ]
      )}
      data-onboarding="navigation-menu"
    >
      <div className="flex flex-col px-2">
        {!isMobileLayout && <NavigationLogo isExpanded={isExpanded} onClick={handleCreateChat} />}
        <NavigationSection items={upperItems} className="mt-4" />
        <div className="h-px my-4 bg-border-primary mx-2" />
        <NavigationSection items={upperSecondaryItems} />
        {((isFavoritesEnabled && isFavoritesPageEnabled) || isPinnedAssistantsEnabled) && (
          <div className="h-px my-4 bg-border-primary mx-2" />
        )}
        <NavigationSection items={favoritesItems} />
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        <nav className="flex flex-col flex-1 min-h-0 gap-2 px-2" aria-label="bottom-nav-links">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <NavigationPinnedSection />
          </div>
          <div
            className={cn(
              'mb-2 h-px mx-2',
              appearance || isMobileLayout ? 'bg-border-primary' : 'bg-white/20'
            )}
          />
          <NavigationSection isBottomSection items={lowerItems} />
        </nav>

        <NavigationProfile isExpanded={isExpanded} />
        {!isMobileLayout && <NavigationExpandButton onClick={toggleNavigation} />}
      </div>
    </header>
  )
}

export default Navigation
