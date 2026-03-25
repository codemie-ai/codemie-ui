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

import { FC, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal'
import Popup from '@/components/Popup'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { useAiAdoptionConfig } from '@/hooks/useAiAdoptionConfig'
import AiAdoptionConfigView from '@/pages/settings/administration/components/AiAdoptionConfigView'
import { analyticsStore } from '@/store/analytics'
import { AnalyticsQueryParams, AnalyticsDashboard } from '@/types/analytics'

import AIAdoptionTab from './AIAdoptionTab'
import CLIInsightsTab from './CLIInsightsTab'
import CustomDashboard from './CustomDashboard'
import InfoNotice from './InfoNotice'
import InsightsTab from './InsightsTab'

interface AnalyticsDashboardProps {
  activeTab: string
  isConfigVisible: boolean
  onHideConfig: () => void
  filters: AnalyticsQueryParams
  isAdoptionEnabled: boolean
  isCustomizationEnabled: boolean
}

type TabId = string

const AnalyticsDashboardComponent: FC<AnalyticsDashboardProps> = ({
  activeTab,
  isConfigVisible,
  onHideConfig,
  filters,
  isAdoptionEnabled,
  isCustomizationEnabled,
}) => {
  const { dashboards } = useSnapshot(analyticsStore)

  const [, setSearchParams] = useSearchParams()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const {
    aiAdoptionConfig,
    loading,
    error,
    editingConfig,
    validationErrors,
    showResetConfirmation,
    handleCancel,
    handleSaveMaturity,
    handleSaveUserEngagement,
    handleSaveAssetReusability,
    handleSaveExpertiseDistribution,
    handleSaveFeatureAdoption,
    handleReset,
    handleResetConfirm,
    handleResetCancel,
    updateNestedValue,
  } = useAiAdoptionConfig({
    onSaveSuccess: () => {
      setRefreshTrigger((prev) => prev + 1)
    },
  })

  useEffect(() => {
    if (!aiAdoptionConfig) {
      analyticsStore.fetchAiAdoptionConfig(activeTab).catch(console.error)
    }
    if (activeTab === AnalyticsDashboard.adoption && aiAdoptionConfig) {
      // Wait for config to load before fetching overview (prevents using default config)
      analyticsStore
        .fetchAiAdoptionOverview({
          ...(filters.projects && filters.projects.length > 0 && { projects: filters.projects }),
          config: aiAdoptionConfig.data,
        })
        .catch(console.error)
    }
  }, [filters, activeTab, aiAdoptionConfig])

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId })
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

    if (isAdoptionEnabled) {
      tabsList.push({
        id: AnalyticsDashboard.adoption,
        label: 'AI/Run Adoption',
        element: <AIAdoptionTab filters={filters} refreshTrigger={refreshTrigger} />,
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
  }, [dashboards, filters, isAdoptionEnabled, isCustomizationEnabled])

  return (
    <div className="analytics-dashboard flex flex-col">
      <InfoNotice
        message="To view your personal spendings — go to"
        linkText="Profile"
        linkTo="/settings/profile"
        className="mb-4"
      />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} isEmbedded={false} />

      <Popup
        visible={isConfigVisible}
        onHide={() => onHideConfig()}
        header="AI/Run Adoption Framework Configuration"
        hideFooter={true}
        isFullWidth={true}
        bodyClassName="max-h-[80vh]"
      >
        <AiAdoptionConfigView
          config={aiAdoptionConfig?.data ?? null}
          loading={loading['ai-adoption-config']}
          error={error['ai-adoption-config']?.message}
          readOnly={false}
          editingConfig={editingConfig}
          validationErrors={validationErrors}
          showResetButton={true}
          onSaveMaturity={handleSaveMaturity}
          onSaveUserEngagement={handleSaveUserEngagement}
          onSaveAssetReusability={handleSaveAssetReusability}
          onSaveExpertiseDistribution={handleSaveExpertiseDistribution}
          onSaveFeatureAdoption={handleSaveFeatureAdoption}
          onReset={handleReset}
          onCancel={handleCancel}
          onUpdate={updateNestedValue}
        />
      </Popup>

      {/* Reset Confirmation Modal */}
      <ConfirmationModal
        header="Reset to Defaults"
        message="Are you sure you want to reset to default configuration? This will clear your custom settings and refresh the analytics data."
        confirmText="Reset"
        cancelText="Cancel"
        visible={showResetConfirmation}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </div>
  )
}

export default AnalyticsDashboardComponent
