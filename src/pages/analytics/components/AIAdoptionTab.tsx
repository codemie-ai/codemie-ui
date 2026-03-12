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

import { openUserEngagementDrillDown, openAssetReusabilityDrillDown } from '@/store/analytics'
import { TabularMetricType } from '@/types/analytics'
import type { AnalyticsQueryParams } from '@/types/analytics'

import AssetReusabilityDrillDownModal from './AssetReusabilityDrillDownModal'
import UserEngagementDrillDownModal from './UserEngagementDrillDownModal'
import MaturityOverviewWidget from './widgets/MaturityOverviewWidget'
import OverviewWidget from './widgets/OverviewWidget'
import TableWidget from './widgets/TableWidget'

interface AdoptionTabProps {
  filters: AnalyticsQueryParams
  refreshTrigger?: number
}

const AdoptionTab: FC<AdoptionTabProps> = ({ filters, refreshTrigger = 0 }) => {
  // Handler for User Engagement row clicks
  const handleUserEngagementRowClick = (row: Record<string, unknown>) => {
    // The row contains project information
    // Extract project name from the row
    const projectName = row.project as string

    if (projectName) {
      openUserEngagementDrillDown(projectName)
    }
  }

  // Handler for Asset Reusability row clicks
  const handleAssetReusabilityRowClick = (row: Record<string, unknown>) => {
    // The row contains project information
    // Extract project name from the row
    const projectName = row.project as string

    if (projectName) {
      openAssetReusabilityDrillDown(projectName)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ===== OVERVIEW CARDS ===== */}
      <section>
        <OverviewWidget />
      </section>

      {/* ===== AI MATURITY OVERVIEW - ALL DIMENSIONS ===== */}
      <section>
        <MaturityOverviewWidget filters={filters} refreshTrigger={refreshTrigger} />
      </section>

      {/* ===== DETAILED METRICS TABLES ===== */}
      <section>
        {/* User Engagement */}
        <div className="grid grid-cols-1 gap-6">
          <TableWidget
            metricType={TabularMetricType.AI_ADOPTION_USER_ENGAGEMENT}
            title="User Engagement"
            description="User engagement metrics and source data"
            filters={filters}
            refreshTrigger={refreshTrigger}
            onRowClick={handleUserEngagementRowClick}
          />
        </div>

        {/* Asset Reusability */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.AI_ADOPTION_ASSET_REUSABILITY}
            title="Asset Reusability"
            description="Asset sharing and collaboration metrics"
            filters={filters}
            refreshTrigger={refreshTrigger}
            onRowClick={handleAssetReusabilityRowClick}
          />
        </div>

        {/* Expertise Distribution */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.AI_ADOPTION_EXPERTISE_DISTRIBUTION}
            title="Expertise Distribution"
            description="Expertise distribution and champion health metrics"
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* Feature Adoption */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <TableWidget
            metricType={TabularMetricType.AI_ADOPTION_FEATURE_ADOPTION}
            title="Feature Adoption"
            description="Sophistication and feature utilization metrics"
            filters={filters}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </section>

      {/* Drill-down modals (conditionally rendered based on store state) */}
      <UserEngagementDrillDownModal />
      <AssetReusabilityDrillDownModal />
    </div>
  )
}

export default AdoptionTab
