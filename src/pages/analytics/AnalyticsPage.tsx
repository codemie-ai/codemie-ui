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

import { FC, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import ConfigureSvg from '@/assets/icons/configure.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { ANALYTICS_EDIT_DASHBOARD } from '@/constants/routes'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import { userStore } from '@/store'
import { analyticsStore } from '@/store/analytics'
import {
  type AnalyticsQueryParams,
  AnalyticsDashboard as AnalyticsDashboardType,
} from '@/types/analytics'

import AnalyticsDashboard from './components/AnalyticsDashboard'
import AnalyticsFilters from './components/AnalyticsFilters'
import DashboardListForm from './components/DashboardListForm/DashboardListForm'
import { type FilterChangeOptions, useAnalyticsFilters } from './hooks/useAnalyticsFilters'

const AnalyticsPage: FC = () => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const { dashboards } = useSnapshot(analyticsStore)
  const isAdmin = user?.isAdmin ?? false
  const isAuditor = user?.isAuditor ?? false
  const [isCustomizationEnabled] = useFeatureFlag('feature:dashboardCustomization')
  const [isLeaderboardConfigEnabled] = useFeatureFlag('aiChampionsLeaderboard')
  const isLeaderboardEnabled = (isAdmin || isAuditor) && isLeaderboardConfigEnabled
  const [isCliAnalyticsConfigEnabled] = useFeatureFlag(FEATURE_FLAGS.CLI_ANALYTICS)
  // Visible to every role; the backend scopes the data each role may read.
  const isCliAnalyticsEnabled = isCliAnalyticsConfigEnabled
  const isMaintainer = user?.isMaintainer ?? false
  const [isUsageAttributionConfigEnabled, isUsageAttributionFlagLoaded] = useFeatureFlag(
    FEATURE_FLAGS.USAGE_ATTRIBUTION
  )
  // Admins, maintainers and auditors only; project admins and other users never see the tab.
  const isUsageAttributionEnabled =
    (isAdmin || isMaintainer || isAuditor) && isUsageAttributionConfigEnabled
  // Environment-determined (LiteLLM proxy availability); not role-gated.
  const [isInsightsEnabled, isInsightsFlagLoaded] = useFeatureFlag(FEATURE_FLAGS.ANALYTICS_INSIGHTS)
  const [isCliInsightsEnabled, isCliInsightsFlagLoaded] = useFeatureFlag(
    FEATURE_FLAGS.ANALYTICS_CLI_INSIGHTS
  )

  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, selectedFilters, handleFilterChange } = useAnalyticsFilters()
  const [showDashboardList, setShowDashboardList] = useState(false)
  const [dashboardsLoaded, setDashboardsLoaded] = useState(false)
  // Bumped by the Refresh button: remounting the dashboard makes every widget fetch again.
  const [refreshKey, setRefreshKey] = useState(0)

  // Seed user options for pre-selected users arriving via URL (e.g. from the
  // "View analytics" button in ProjectMembersManager) or restored from storage.  Fetched once on mount
  // so the selected chip renders with a label even before the main filter load.
  const [seedUserOptions, setSeedUserOptions] = useState<Array<{ label: string; value: string }>>(
    []
  )
  const seedFetchedRef = useRef(false)

  const tab = searchParams.get('tab') ?? AnalyticsDashboardType.insights

  const isInsightsTab = tab === AnalyticsDashboardType.insights
  const isLeaderboardTab = tab === AnalyticsDashboardType.leaderboard
  const isUsageAttributionTab = tab === AnalyticsDashboardType.usageAttribution
  const isCustomDashboard =
    dashboardsLoaded &&
    tab &&
    !isInsightsTab &&
    !isLeaderboardTab &&
    dashboards.some((d) => d.id === tab)

  const dashboardId = tab!

  useEffect(() => {
    analyticsStore.loadDashboards().then(() => setDashboardsLoaded(true))
  }, [])

  useEffect(() => {
    if (seedFetchedRef.current || !filters.users?.length) return
    seedFetchedRef.current = true
    // Fetch user options with the broadest scope (the pre-selected projects, if any, and no
    // time window) so the user appears even with no activity in the current period.
    userStore
      .getAnalyticsUsers(filters.projects?.length ? { projects: filters.projects } : {})
      .then((options) => {
        const preselected = new Set(filters.users ?? [])
        setSeedUserOptions(
          options.filter((o: { label: string; value: string }) => preselected.has(o.value))
        )
      })
      .catch(console.error)
    // Run once on mount only — deps intentionally empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One entry per flag-gated tab, in fallback priority order. `loaded: true` marks tabs gated by
  // role-derived flags only; the others wait for the flag, which arrives with the app config.
  const tabFlags: Array<{ tab: AnalyticsDashboardType; enabled: boolean; loaded: boolean }> = [
    {
      tab: AnalyticsDashboardType.insights,
      enabled: isInsightsEnabled,
      loaded: isInsightsFlagLoaded,
    },
    {
      tab: AnalyticsDashboardType.cliInsights,
      enabled: isCliInsightsEnabled,
      loaded: isCliInsightsFlagLoaded,
    },
    {
      tab: AnalyticsDashboardType.usageAttribution,
      enabled: isUsageAttributionEnabled,
      loaded: isUsageAttributionFlagLoaded,
    },
    { tab: AnalyticsDashboardType.leaderboard, enabled: isLeaderboardEnabled, loaded: true },
    { tab: AnalyticsDashboardType.cliAnalytics, enabled: isCliAnalyticsEnabled, loaded: true },
  ]

  useEffect(() => {
    if (!dashboardsLoaded) return
    // Links saved before the tab was renamed to AI Attribution.
    if (tab === 'cliAnalytics') {
      setSearchParams(
        (prev) => {
          prev.set('tab', AnalyticsDashboardType.cliAnalytics)
          return prev
        },
        { replace: true }
      )
      return
    }
    const flag = tabFlags.find((f) => f.tab === tab)
    if (flag && !flag.loaded) return
    const isKnownTab = (Object.values(AnalyticsDashboardType) as string[]).includes(tab)
    const isValidTab =
      (isKnownTab && (flag?.enabled ?? true)) || dashboards.some((d) => d.id === tab)
    if (!isValidTab) {
      const fallbackTab = tabFlags.find((f) => f.enabled)?.tab
      if (fallbackTab) setSearchParams({ tab: fallbackTab }, { replace: true })
    }
  }, [
    tab,
    dashboardsLoaded,
    dashboards,
    setSearchParams,
    isCliAnalyticsEnabled,
    isLeaderboardEnabled,
    isUsageAttributionEnabled,
    isUsageAttributionFlagLoaded,
    isInsightsEnabled,
    isInsightsFlagLoaded,
    isCliInsightsEnabled,
    isCliInsightsFlagLoaded,
  ])

  const handleFiltersChange = (newFilters: AnalyticsQueryParams, options?: FilterChangeOptions) => {
    handleFilterChange(newFilters, options)
  }

  const handleManageDashboards = () => {
    setShowDashboardList(true)
  }

  const handleEditDashboard = () => {
    if (dashboardId) {
      router.push({
        name: ANALYTICS_EDIT_DASHBOARD,
        params: { dashboardId },
      })
    }
  }

  const actions = (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>
        <RefreshSvg />
        Refresh
      </Button>
      {isCustomizationEnabled && isCustomDashboard && (
        <Button variant="primary" onClick={handleEditDashboard}>
          <EditSvg />
          Edit Dashboard
        </Button>
      )}
      {isCustomizationEnabled && (
        <Button variant="primary" onClick={handleManageDashboards}>
          <ConfigureSvg />
          Manage Dashboards
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex h-full min-w-0">
      {!isLeaderboardTab && (
        <Sidebar title="Analytics" description="Monitor usage metrics and performance">
          <AnalyticsFilters
            filters={selectedFilters}
            onFiltersChange={handleFiltersChange}
            initialUserOptions={seedUserOptions}
            showProjectFilter={!isUsageAttributionTab}
            showUserFilter={!isUsageAttributionTab}
            note={
              isUsageAttributionTab
                ? 'No project or user filter on this tab: it attributes all usage across projects and people. Use the search in each table to find a project, repository or person.'
                : undefined
            }
          />
        </Sidebar>
      )}

      <PageLayout title="Analytics Dashboard" rightContent={actions}>
        <div className="min-h-full flex flex-col pb-24 pt-6 min-w-0">
          <AnalyticsDashboard
            key={refreshKey}
            activeTab={tab}
            filters={filters}
            isLeaderboardEnabled={isLeaderboardEnabled}
            isCustomizationEnabled={isCustomizationEnabled}
            isCliAnalyticsEnabled={isCliAnalyticsEnabled}
            isUsageAttributionEnabled={isUsageAttributionEnabled}
            isInsightsEnabled={isInsightsEnabled}
            isCliInsightsEnabled={isCliInsightsEnabled}
          />
        </div>
      </PageLayout>

      <DashboardListForm
        visible={showDashboardList}
        onHide={() => setShowDashboardList(false)}
        currentDashboardId={dashboardId}
      />
    </div>
  )
}

export default AnalyticsPage
