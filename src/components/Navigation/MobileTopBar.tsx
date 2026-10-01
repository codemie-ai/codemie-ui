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

import { FC, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useMatches } from 'react-router'
import { useSnapshot } from 'valtio'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import HamburgerSvg from '@/assets/icons/hamburger.svg?react'
import LogoDarkSvg from '@/assets/images/logo-dark.svg?react'
import LogoLightSvg from '@/assets/images/logo-light.svg?react'
import { MOBILE_TOP_BAR_BOTTOM_CSS_VAR } from '@/constants/mobileLayout'
import { ROUTE_ID_TO_TITLE } from '@/constants/pageTitles'
import { useTheme } from '@/hooks/useTheme'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { cn } from '@/utils/utils'

import { IconType } from './constants'
import { iconComponents } from './NavigationSection/NavigationLink'

// Keyed by the first path segment, so every page of a section shows the section it belongs to.
const SECTIONS: Record<string, { label: string; icon?: IconType }> = {
  chats: { label: 'Chats', icon: IconType.CHAT },
  assistants: { label: 'Assistants', icon: IconType.ASSISTANT },
  skills: { label: 'Skills', icon: IconType.SKILL },
  workflows: { label: 'Workflows', icon: IconType.WORKFLOW },
  applications: { label: 'Applications', icon: IconType.APPLICATION },
  integrations: { label: 'Integrations', icon: IconType.INTEGRATION },
  'data-sources': { label: 'Data Sources', icon: IconType.DATASOURCE },
  schedulers: { label: 'Schedulers', icon: IconType.SCHEDULER },
  katas: { label: 'AI Katas', icon: IconType.KATA },
  analytics: { label: 'Analytics', icon: IconType.ANALYTICS },
  favorites: { label: 'Favorites', icon: IconType.FAVORITES },
  help: { label: 'Help', icon: IconType.INFO },
  settings: { label: 'Settings' },
}

/**
 * Top bar of the mobile/tablet shell: logo, the button that opens the page sidebar as a drawer and
 * the section switcher that opens the navigation menu.
 */
const MobileTopBar: FC = () => {
  const router = useVueRouter()
  const { pathname, search, key } = useLocation()
  const matches = useMatches()
  const { isDark, appearance } = useTheme()
  const { mobileNavigationOpen, mobileSidebarOpen, pageSidebarCount } = useSnapshot(appInfoStore)
  const barRef = useRef<HTMLDivElement>(null)
  const lastLocationRef = useRef({ pathname, search })

  // The navigation menu and the page sidebar open right below the bar, whose offset changes when
  // the dismissible app banner above it appears or goes away (that also resizes the parent).
  useLayoutEffect(() => {
    const bar = barRef.current
    const root = document.documentElement
    const update = () => {
      if (bar) {
        root.style.setProperty(
          MOBILE_TOP_BAR_BOTTOM_CSS_VAR,
          `${bar.getBoundingClientRect().bottom}px`
        )
      }
    }
    update()

    const observer = new ResizeObserver(update)
    if (bar?.parentElement) observer.observe(bar.parentElement)

    return () => {
      observer.disconnect()
      root.style.removeProperty(MOBILE_TOP_BAR_BOTTOM_CSS_VAR)
    }
  }, [])

  // Any navigation closes both overlays, including picking the page that is already open (same
  // URL, new location key). A query-only change, e.g. a filter set in the open sidebar, keeps them.
  useEffect(() => {
    const last = lastLocationRef.current
    lastLocationRef.current = { pathname, search }
    if (last.pathname === pathname && last.search !== search) return

    appInfoStore.setMobileNavigationOpen(false)
    appInfoStore.setMobileSidebarOpen(false)
  }, [pathname, search, key])

  // Leaving the mobile layout (e.g. rotating a tablet) must not leave an overlay open for later.
  useEffect(
    () => () => {
      appInfoStore.setMobileNavigationOpen(false)
      appInfoStore.setMobileSidebarOpen(false)
    },
    []
  )

  const section = SECTIONS[pathname.split('/')[1]]
  const routeTitle = [...matches]
    .reverse()
    .map(({ id }) => ROUTE_ID_TO_TITLE[id])
    .find(Boolean)
  const label = section?.label ?? routeTitle ?? 'Menu'
  const SectionIcon = section?.icon ? iconComponents[section.icon] : null

  const customLogo =
    appearance?.logoMode === 'custom' ? appearance.squareLogo || appearance.rectangularLogo : ''
  const showBorder = appearance?.navigationBorder ?? !isDark

  const handleCreateChat = async () => {
    await chatsStore.startNewChat('', '', false)
    router.push({ name: 'new-chat' })
  }

  const renderLogo = () => {
    if (customLogo) return <img src={customLogo} className="h-8 w-8 object-contain" alt="" />
    return isDark ? <LogoDarkSvg className="h-8 w-8" /> : <LogoLightSvg className="h-8 w-8" />
  }

  return (
    <div
      ref={barRef}
      className={cn(
        'flex items-center gap-4 h-14 min-h-14 px-4 bg-surface-base-navigation',
        showBorder && 'border-b border-border-structural'
      )}
    >
      <button
        type="button"
        aria-label="New chat"
        className="flex shrink-0 items-center"
        onClick={handleCreateChat}
      >
        {renderLogo()}
      </button>

      {pageSidebarCount > 0 && (
        <button
          type="button"
          aria-label={mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={mobileSidebarOpen}
          className="flex shrink-0 items-center justify-center h-8 w-8 rounded-lg text-text-primary hover:bg-surface-specific-navigation-link"
          onClick={() => appInfoStore.setMobileSidebarOpen(!mobileSidebarOpen)}
        >
          {mobileSidebarOpen ? (
            <CrossSvg className="h-5 w-5" aria-hidden="true" />
          ) : (
            <HamburgerSvg className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      )}

      <button
        type="button"
        aria-label={`Navigation menu, current section ${label}`}
        aria-expanded={mobileNavigationOpen}
        aria-controls="navigation-menu"
        className={cn(
          'flex flex-1 min-w-0 items-center gap-2 h-8 px-3 rounded-lg',
          'border border-border-structural bg-surface-base-secondary',
          'text-sm text-text-quaternary hover:border-border-secondary transition-colors'
        )}
        onClick={() => appInfoStore.setMobileNavigationOpen(!mobileNavigationOpen)}
      >
        {SectionIcon && <SectionIcon className="shrink-0" aria-hidden="true" />}
        <span className="truncate">{label}</span>
        <ChevronDownSvg
          aria-hidden="true"
          className={cn('ml-auto shrink-0 text-text-primary transition-transform', {
            'rotate-180': mobileNavigationOpen,
          })}
        />
      </button>
    </div>
  )
}

export default MobileTopBar
