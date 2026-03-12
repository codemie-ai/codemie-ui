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

import { FC, useCallback, useMemo } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import OrderList from '@/components/form/OrderList/OrderList'
import OrderListButton from '@/components/form/OrderList/OrderListButton'
import OrderListTemplate from '@/components/form/OrderList/OrderListTemplate'
import { AnalyticsDashboardItem } from '@/types/analytics'

type DashboardWithId = {
  id: string
  dashboard: AnalyticsDashboardItem
  index: number
}

interface DashboardListProps {
  dashboards: AnalyticsDashboardItem[]
  onReorder: (dashboards: AnalyticsDashboardItem[]) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const DashboardList: FC<DashboardListProps> = ({ dashboards, onReorder, onEdit, onDelete }) => {
  const dashboardsWithIds = useMemo(
    (): DashboardWithId[] =>
      dashboards.map((dashboard, index) => ({
        id: dashboard.id,
        dashboard,
        index,
      })),
    [dashboards]
  )

  const handleOrderChange = useCallback(
    (reordered: DashboardWithId[]) => {
      const newDashboards = reordered.map((item) => dashboards[item.index])
      onReorder(newDashboards)
    },
    [dashboards, onReorder]
  )

  const itemTemplate = useCallback(
    (item: DashboardWithId) => {
      const { dashboard } = item

      return (
        <OrderListTemplate
          name={dashboard.name}
          className="py-1.5 pl-3 pr-2 bg-surface-base-secondary border-border-secondary"
          actions={
            <>
              <OrderListButton
                aria-label={`Edit ${dashboard.name}`}
                onClick={() => onEdit(dashboard.id)}
              >
                <EditSvg />
              </OrderListButton>
              <OrderListButton
                aria-label={`Delete ${dashboard.name}`}
                onClick={() => onDelete(dashboard.id)}
              >
                <CrossSvg />
              </OrderListButton>
            </>
          }
        />
      )
    },
    [onEdit, onDelete]
  )

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col text-center gap-8 py-8">
        <p className="text-text-tertiary text-sm text-center">No custom dashboards yet</p>
      </div>
    )
  }

  return (
    <OrderList
      idKey="id"
      value={dashboardsWithIds}
      itemTemplate={itemTemplate}
      onChange={handleOrderChange}
      className="w-full"
    />
  )
}

export default DashboardList
