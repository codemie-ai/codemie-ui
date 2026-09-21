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

import { FC, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { analyticsStore } from '@/store/analytics'
import { AnalyticsQueryParams, AnalyticsDashboard } from '@/types/analytics'

import CliAnalyticsTab from './cli-analytics/CliAnalyticsTab'
import CLIInsightsTab from './CLIInsightsTab'
import CustomDashboard from './CustomDashboard'
import InfoNotice from './InfoNotice'
import InsightsTab from './InsightsTab'
import LeaderboardTab from './leaderboard/LeaderboardTab'

interface AnalyticsDashboardProps {
  activeTab: string
  filters: AnalyticsQueryParams
  isLeaderboardEnabled: boolean
  isCustomizationEnabled: boolean
  isCliAnalyticsEnabled: boolean
}

const AnalyticsDashboardComponent: FC<AnalyticsDashboardProps> = ({
  activeTab,
  filters,
  isLeaderboardEnabled,
  isCustomizationEnabled,
  isCliAnalyticsEnabled,
}) => {
  const { dashboards } = useSnapshot(analyticsStore)

  const [, setSearchParams] = useSearchParams()

  const handleTabChange = (tabId: string) => {
    setSearchParams((prev) => {
      prev.set('tab', tabId)
      return prev
    })
  }

  const tabs: Tab<string>[] = useMemo(() => {
    const tabsList: Tab<string>[] = [
      {
        id: AnalyticsDashboard.insights,
        label: 'Insights',
        element: <InsightsTab filters={filters} />,
        className: '[overflow-wrap:normal]',
      },
      {
        id: AnalyticsDashboard.cliInsights,
        label: 'CLI Insights',
        element: <CLIInsightsTab filters={filters} />,
        className: '[overflow-wrap:normal]',
      },
    ]

    if (isCliAnalyticsEnabled) {
      tabsList.push({
        id: AnalyticsDashboard.cliAnalytics,
        label: 'CLI Analytics',
        element: <CliAnalyticsTab filters={filters} />,
        className: '[overflow-wrap:normal]',
      })
    }

    if (isLeaderboardEnabled) {
      tabsList.push({
        id: AnalyticsDashboard.leaderboard,
        label: 'Leaderboard',
        element: <LeaderboardTab />,
        className: '[overflow-wrap:normal]',
      })
    }

    if (isCustomizationEnabled) {
      dashboards.forEach((dashboard) => {
        tabsList.push({
          id: dashboard.id,
          label: dashboard.name,
          element: <CustomDashboard filters={filters} dashboard={dashboard} />,
        })
      })
    }

    return tabsList
  }, [dashboards, filters, isLeaderboardEnabled, isCustomizationEnabled, isCliAnalyticsEnabled])

  return (
    <div className="analytics-dashboard flex flex-col min-w-0">
      <InfoNotice
        message="To view your personal spendings — go to"
        linkText="Profile"
        linkTo="/settings/profile"
        className="mb-4"
      />
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        isEmbedded={false}
        className="min-w-0"
        tabClassName="min-w-0"
      />
    </div>
  )
}

export default AnalyticsDashboardComponent
