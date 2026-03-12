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

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import { ANALYTICS_EDIT_DASHBOARD } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { AnalyticsDashboardItem, AnalyticsQueryParams } from '@/types/analytics'

import DashboardSection from './DashboardSection'

interface CustomDashboardProps {
  filters: AnalyticsQueryParams
  dashboard: AnalyticsDashboardItem
}

const CustomDashboard: FC<CustomDashboardProps> = ({ filters, dashboard }) => {
  const router = useVueRouter()

  const hasContent =
    dashboard.sections.length > 0 &&
    dashboard.sections.some((section) => section.widgets.length > 0)

  const emptyDashboard = (
    <div className="flex flex-col items-center justify-center py-24">
      <p className="text-text-tertiary text-lg mb-6">This dashboard is empty</p>
      <Button
        variant="primary"
        onClick={() =>
          router.push({
            name: ANALYTICS_EDIT_DASHBOARD,
            params: { dashboardId: dashboard.id },
          })
        }
      >
        <PlusSvg /> Add Widgets
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {!hasContent
        ? emptyDashboard
        : dashboard.sections.map((section) => (
            <DashboardSection key={section.id} section={section} filters={filters} />
          ))}
    </div>
  )
}

export default CustomDashboard
