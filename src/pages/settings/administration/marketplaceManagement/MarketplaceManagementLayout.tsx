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

import { FC, useEffect, useMemo } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { MARKETPLACE_MANAGEMENT_PATH } from '@/constants/routes'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { userStore } from '@/store/user'
import toaster from '@/utils/toaster'

const OVERVIEW_PATH = MARKETPLACE_MANAGEMENT_PATH
const MARKETPLACE_ASSISTANTS_PATH = `${OVERVIEW_PATH}/marketplace-assistants`
const CLEANUP_PATH = `${OVERVIEW_PATH}/cleanup`
const SETTINGS_PATH = `${OVERVIEW_PATH}/settings`

type MarketplaceTabId = 'overview' | 'marketplaceAssistants' | 'cleanup' | 'settings'

const TAB_PATHS: Record<MarketplaceTabId, string> = {
  overview: OVERVIEW_PATH,
  marketplaceAssistants: MARKETPLACE_ASSISTANTS_PATH,
  cleanup: CLEANUP_PATH,
  settings: SETTINGS_PATH,
}

interface TabLabelProps {
  text: string
  count: number | null | undefined
}

/**
 * Tab label with an optional trailing count.
 *
 * A confirmed zero renders as "0"; `null`/`undefined` means "not loaded yet"
 * and renders no badge at all, so an admin can tell an empty queue apart from
 * one that has simply not been fetched.
 */
const TabLabel: FC<TabLabelProps> = ({ text, count }) => (
  <>
    {text}
    {count != null && (
      <span className="ml-2 inline-flex items-center rounded-full bg-surface-base-secondary px-1.5 py-0.5 text-[11px] font-medium leading-none tabular-nums text-text-secondary">
        {count > 9999 ? '9,999+' : count.toLocaleString()}
      </span>
    )}
  </>
)

/**
 * Route-level layout shared by the three Marketplace management tabs.
 *
 * The tab strip is the shared `@/components/Tabs` component rather than a
 * hand-rolled `NavLink` row — the bespoke version inherited the browser's
 * default link underline and focus ring, so the active tab rendered with a
 * blue box drawn around it.
 *
 * Tabs is driven from the URL (`activeTab` derived from the pathname,
 * `onChange` navigating), and every tab renders the same `<Outlet />`, so the
 * router still decides which page is shown.
 */
const ADMINISTRATION_URL = '/settings/administration'

const MarketplaceManagementLayout: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { overview } = useSnapshot(marketplaceManagementStore)
  const { user } = useSnapshot(userStore)

  const canAccess = Boolean(user?.isAdmin || user?.isMaintainer)

  useEffect(() => {
    if (user && !canAccess) {
      toaster.error('You do not have permission to access Marketplace Management.')
      navigate(ADMINISTRATION_URL)
    }
  }, [canAccess, navigate, user])

  useEffect(() => {
    if (!canAccess) return
    // The overview feeds both tab badges, so it belongs here rather than on
    // any one tab. Facets deliberately do NOT: the Cleanup filters are their
    // only consumer and that page loads them itself. Fetching them here as
    // well cost every Cleanup view two `/facets` requests — two audit-cache
    // touches, and on a cold cache one of them synchronously runs a full
    // audit (F-62) — while the Overview and Pending tabs paid for a payload
    // they never render.
    marketplaceManagementStore.loadOverview()
    // Pick up an audit started by another admin, in another tab, or before a
    // reload — the server owns that state, so the button is correct on entry.
    // This also starts following that run, so the button is released when it
    // ends instead of waiting for a manual reload (F-63).
    marketplaceManagementStore.refreshAuditStatus()
  }, [canAccess])

  let activeTab: MarketplaceTabId = 'overview'
  if (location.pathname.startsWith(SETTINGS_PATH)) activeTab = 'settings'
  else if (location.pathname.startsWith(CLEANUP_PATH)) activeTab = 'cleanup'
  else if (location.pathname.startsWith(MARKETPLACE_ASSISTANTS_PATH))
    activeTab = 'marketplaceAssistants'

  // Both counts come from the overview payload, which the effect above loads
  // on every tab, so the badges do not depend on which tabs were visited.
  // `pending.count` shares its predicate with `GET /marketplace-assistants`
  // (status=PENDING_REVIEW) — the tab's own query — so the badge can't
  // disagree with what the tab renders. `overview.total` is `is_global`-based
  // and can diverge from it (F-20).
  const marketplaceAssistantsCount = overview?.pending?.count ?? null
  // The Cleanup queue's "All" default lists every bucket, VERIFIED included,
  // so the badge sums all three — not `overview.total`, every assistant.
  const cleanupCount = overview
    ? (overview.buckets?.VERIFIED ?? 0) +
      (overview.buckets?.COMMUNITY ?? 0) +
      (overview.buckets?.DELETE ?? 0)
    : null

  const tabs = useMemo<Tab<MarketplaceTabId>[]>(
    () => [
      {
        id: 'overview',
        label: 'Overview',
        testId: 'mm-tab-overview',
        element: <Outlet />,
      },
      {
        id: 'marketplaceAssistants',
        label: <TabLabel text="Review queue" count={marketplaceAssistantsCount} />,
        testId: 'mm-tab-marketplace-assistants',
        element: <Outlet />,
      },
      {
        id: 'cleanup',
        label: <TabLabel text="Cleanup queue" count={cleanupCount} />,
        testId: 'mm-tab-cleanup',
        element: <Outlet />,
      },
      {
        id: 'settings',
        label: 'Config',
        testId: 'mm-tab-settings',
        element: <Outlet />,
      },
    ],
    [marketplaceAssistantsCount, cleanupCount]
  )

  // Render nothing until the user is known to be an admin or maintainer — the tab
  // pages run their own mount-time loaders, which would 403 for anyone else
  // before the redirect above lands.
  if (!canAccess) return null

  return (
    <SettingsLayout
      contentTitle="Marketplace management"
      content={
        <Tabs<MarketplaceTabId>
          alwaysShowTabs
          isEmbedded={false}
          tabs={tabs}
          activeTab={activeTab}
          onChange={(tabId) => navigate(TAB_PATHS[tabId])}
          className="h-full min-h-0 pt-4"
          headerClassName="gap-6"
          // The tab panel is the scroll region, so the tab strip stays put
          // while the page scrolls beneath it. `show-scroll` is required —
          // main.scss hides the scrollbar on any scroller without it.
          tabClassName="flex min-h-0 flex-col overflow-y-auto show-scroll"
        />
      }
    />
  )
}

export default MarketplaceManagementLayout
