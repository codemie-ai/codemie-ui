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

import { FC, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import ConfigurationSvg from '@/assets/icons/configuration.svg?react'
import ConfigureSvg from '@/assets/icons/configure.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
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
import { useAnalyticsFilters } from './hooks/useAnalyticsFilters'

const AnalyticsPage: FC = () => {
  const router = useVueRouter()
  const { aiAdoptionConfig } = useSnapshot(analyticsStore)
  const { user } = useSnapshot(userStore)
  const isAdoptionEnabled = user?.isAdmin ?? false
  const [isCustomizationEnabled] = useFeatureFlag('feature:dashboardCustomization')

  const [searchParams] = useSearchParams()
  const { filters, handleFilterChange } = useAnalyticsFilters()
  const [showDashboardList, setShowDashboardList] = useState(false)
  const [isConfigVisible, setIsConfigVisible] = useState(false)

  const tab = searchParams.get('tab') ?? AnalyticsDashboardType.insights

  const isInsightsTab = tab === AnalyticsDashboardType.insights
  const isAdoptionTab = tab === AnalyticsDashboardType.adoption
  const isCustomDashboard = tab && !isAdoptionTab && !isInsightsTab

  const dashboardId = tab!

  useEffect(() => {
    analyticsStore.loadDashboards()
  }, [])

  const handleFiltersChange = (newFilters: AnalyticsQueryParams) => {
    handleFilterChange(newFilters)
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

  const handleOpenConfigModal = useCallback(async () => {
    setIsConfigVisible(true)
    if (!aiAdoptionConfig && tab) {
      await analyticsStore.fetchAiAdoptionConfig(tab).catch(console.error)
    }
  }, [tab, aiAdoptionConfig])

  const actions = (
    <div className="flex gap-2">
      {isCustomizationEnabled && isCustomDashboard && (
        <Button variant="primary" onClick={handleEditDashboard}>
          <EditSvg />
          Edit Dashboard
        </Button>
      )}
      {isAdoptionTab && isAdoptionEnabled && (
        <Button
          variant="secondary"
          aria-label="Open framework configuration"
          onClick={handleOpenConfigModal}
        >
          <ConfigurationSvg className="text-button-base-text" />
          Configuration
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
    <div className="flex h-full">
      <Sidebar title="Analytics" description="Monitor usage metrics and performance">
        <AnalyticsFilters filters={filters} onFiltersChange={handleFiltersChange} />
      </Sidebar>

      <PageLayout title="Analytics Dashboard" rightContent={actions}>
        <div className="min-h-full flex flex-col pb-24 pt-6">
          <AnalyticsDashboard
            activeTab={tab}
            filters={filters}
            isConfigVisible={isConfigVisible}
            isAdoptionEnabled={isAdoptionEnabled}
            isCustomizationEnabled={isCustomizationEnabled}
            onHideConfig={() => setIsConfigVisible(false)}
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
