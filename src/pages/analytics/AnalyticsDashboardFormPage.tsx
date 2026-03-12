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

import { FC, useEffect } from 'react'
import { useParams } from 'react-router'
import { useSnapshot } from 'valtio'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { FormIDs } from '@/constants/formIds'
import { ANALYTICS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { DASHBOARD_LIMIT_MSG } from '@/pages/analytics/constants'
import { analyticsStore } from '@/store/analytics'
import { AnalyticsDashboardItem } from '@/types/analytics'
import toaster from '@/utils/toaster'

import DashboardForm from './components/DashboardForm/DashboardForm'

interface AnalyticsDashboardFormPageProps {
  isEditing?: boolean
}

const AnalyticsDashboardFormPage: FC<AnalyticsDashboardFormPageProps> = ({ isEditing = false }) => {
  const formId = FormIDs.DASHBOARD_FORM
  const router = useVueRouter()
  const { dashboardId = '' } = useParams<{ dashboardId?: string }>()
  const { dashboards } = useSnapshot(analyticsStore)

  const initialData = isEditing ? dashboards.find((d) => d.id === dashboardId) : null
  const isDashboardLimitReached = !isEditing && analyticsStore.isDashboardLimitReached()

  useEffect(() => {
    analyticsStore.loadDashboards()
  }, [])

  const handleSave = async (dashboard: Omit<AnalyticsDashboardItem, 'id'>) => {
    try {
      if (isEditing && dashboardId) {
        await analyticsStore.updateDashboard(dashboardId, dashboard)
        toaster.success('Dashboard updated successfully!')
        router.push({
          name: ANALYTICS,
          query: { tab: dashboardId },
        })
      } else {
        const newDashboardId = await analyticsStore.createDashboard(dashboard)
        toaster.success('Dashboard created successfully!')
        router.push({
          name: ANALYTICS,
          query: { tab: newDashboardId },
        })
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error)
      toaster.error('Failed to save dashboard')
    }
  }

  const handleCancel = () => {
    if (isEditing && dashboardId) {
      router.push({
        name: ANALYTICS,
        query: { tab: dashboardId },
      })
    } else {
      router.push({ name: ANALYTICS })
    }
  }

  const pageTitle = isEditing ? 'Edit Dashboard' : 'Create Dashboard'

  const actions = (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={handleCancel}>
        Cancel
      </Button>
      <Button
        variant="primary"
        form={formId}
        buttonType="submit"
        disabled={isDashboardLimitReached}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={isDashboardLimitReached ? DASHBOARD_LIMIT_MSG : undefined}
      >
        <PlusSvg />
        Save
      </Button>
    </div>
  )

  return (
    <div className="flex h-full">
      <Sidebar title="Analytics" description="Monitor usage metrics and performance" />

      <PageLayout
        limitWidth
        title={pageTitle}
        rightContent={actions}
        showBack
        onBack={handleCancel}
      >
        {(!isEditing || initialData) && (
          <DashboardForm formId={formId} onSubmit={handleSave} initialData={initialData} />
        )}
      </PageLayout>
    </div>
  )
}

export default AnalyticsDashboardFormPage
