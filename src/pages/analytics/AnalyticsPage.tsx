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
  const isProjectAdmin = user?.projects?.some((project) => project.is_project_admin) ?? false
  const isAuditor = user?.isAuditor ?? false
  const [isCustomizationEnabled] = useFeatureFlag('feature:dashboardCustomization')
  const [isLeaderboardConfigEnabled] = useFeatureFlag('aiChampionsLeaderboard')
  const isLeaderboardEnabled = (isAdmin || isAuditor) && isLeaderboardConfigEnabled
  const [isCliAnalyticsConfigEnabled] = useFeatureFlag(FEATURE_FLAGS.CLI_ANALYTICS)
  const isCliAnalyticsEnabled = (isAdmin || isProjectAdmin) && isCliAnalyticsConfigEnabled
  const isMaintainer = user?.isMaintainer ?? false
  const [isUsageAttributionConfigEnabled, isUsageAttributionFlagLoaded] = useFeatureFlag(
    FEATURE_FLAGS.USAGE_ATTRIBUTION
  )
  // Admins, maintainers and auditors only; project admins and other users never see the tab.
  const isUsageAttributionEnabled =
    (isAdmin || isMaintainer || isAuditor) && isUsageAttributionConfigEnabled

  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, selectedFilters, handleFilterChange } = useAnalyticsFilters()
  const [showDashboardList, setShowDashboardList] = useState(false)
  const [dashboardsLoaded, setDashboardsLoaded] = useState(false)

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

  useEffect(() => {
    if (!dashboardsLoaded) return
    const isKnownTab = (Object.values(AnalyticsDashboardType) as string[]).includes(tab)
    // The flag arrives with the app config: do not leave the tab before it is known.
    if (tab === AnalyticsDashboardType.usageAttribution && !isUsageAttributionFlagLoaded) return
    const isFlagGatedTabEnabled =
      (tab !== AnalyticsDashboardType.cliAnalytics || isCliAnalyticsEnabled) &&
      (tab !== AnalyticsDashboardType.leaderboard || isLeaderboardEnabled) &&
      (tab !== AnalyticsDashboardType.usageAttribution || isUsageAttributionEnabled)
    const isValidTab = (isKnownTab && isFlagGatedTabEnabled) || dashboards.some((d) => d.id === tab)
    if (!isValidTab) {
      setSearchParams({ tab: AnalyticsDashboardType.insights }, { replace: true })
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
            activeTab={tab}
            filters={filters}
            isLeaderboardEnabled={isLeaderboardEnabled}
            isCustomizationEnabled={isCustomizationEnabled}
            isCliAnalyticsEnabled={isCliAnalyticsEnabled}
            isUsageAttributionEnabled={isUsageAttributionEnabled}
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
