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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC, useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { ANALYTICS, ANALYTICS_EDIT_DASHBOARD, ANALYTICS_NEW_DASHBOARD } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { DASHBOARD_LIMIT_MSG } from '@/pages/analytics/constants'
import { analyticsStore } from '@/store/analytics'
import { AnalyticsDashboardItem } from '@/types/analytics'
import toaster from '@/utils/toaster'

import DashboardList from './DashboardList'

const dashboardListSchema = Yup.object().shape({
  dashboards: Yup.array()
    .of(
      Yup.object().shape({
        id: Yup.string().required(),
        name: Yup.string().required(),
        sections: Yup.array().required(),
      })
    )
    .required(),
})

type DashboardListFormSchema = Yup.InferType<typeof dashboardListSchema>

interface DashboardListFormProps {
  visible: boolean
  onHide: () => void
  currentDashboardId?: string
}

const DashboardListForm: FC<DashboardListFormProps> = ({ visible, onHide, currentDashboardId }) => {
  const router = useVueRouter()
  const { dashboards: dashboardsState } = useSnapshot(analyticsStore)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const {
    setValue,
    watch,
    reset,
    handleSubmit: formHandleSubmit,
  } = useForm<DashboardListFormSchema>({
    mode: 'onChange',
    shouldUnregister: true,
    resolver: yupResolver(dashboardListSchema) as any,
    defaultValues: {
      dashboards: dashboardsState ?? [],
    },
  })

  useEffect(() => {
    if (visible) reset({ dashboards: dashboardsState })
  }, [visible, dashboardsState])

  const formDashboards = watch('dashboards') ?? []
  const isDashboardLimitReached = analyticsStore.isDashboardLimitReached()

  const handleCreate = () => {
    onHide()
    router.push({ name: ANALYTICS_NEW_DASHBOARD })
  }

  const handleEdit = (id: string) => {
    onHide()
    router.push({
      name: ANALYTICS_EDIT_DASHBOARD,
      params: { dashboardId: id },
    })
  }

  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = () => {
    if (deleteId !== null) {
      const updatedDashboards = formDashboards.filter((d) => d.id !== deleteId)
      setValue('dashboards', updatedDashboards)
      setDeleteId(null)
    }
  }

  const handleReorder = useCallback((reorderedDashboards: AnalyticsDashboardItem[]) => {
    setValue('dashboards', reorderedDashboards)
  }, [])

  const handleSubmit = formHandleSubmit(async (data: DashboardListFormSchema) => {
    try {
      await analyticsStore.saveDashboards(data.dashboards)
      toaster.success('Dashboards saved successfully!')
      onHide()

      if (currentDashboardId) {
        const dashboardStillExists = data.dashboards.some((d) => d.id === currentDashboardId)
        if (!dashboardStillExists) {
          router.push({ name: ANALYTICS })
        }
      }
    } catch (error) {
      console.error('Failed to save dashboards:', error)
      toaster.error('Failed to save dashboards')
    }
  })

  const deleteDashboardMessage = deleteId
    ? `Are you sure you want to delete ${formDashboards.find((d) => d.id === deleteId)?.name}`
    : ''

  return (
    <>
      <Popup
        dismissableMask={false}
        visible={visible}
        header="Manage Dashboard"
        className="max-w-xl w-full"
        submitText="Save"
        onHide={onHide}
        onSubmit={handleSubmit}
        withBorderBottom={false}
      >
        <div className="flex items-center justify-between w-full mb-2">
          <h2 className="font-semibold mb-0">Dashboards</h2>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isDashboardLimitReached}
            data-tooltip-id="react-tooltip"
            data-tooltip-content={isDashboardLimitReached ? DASHBOARD_LIMIT_MSG : undefined}
          >
            <PlusSvg />
            Add New Dashboard
          </Button>
        </div>

        <DashboardList
          dashboards={formDashboards}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      </Popup>

      <ConfirmationModal
        visible={deleteId !== null}
        header="Delete Dashboard"
        message={deleteDashboardMessage}
        confirmText="Delete"
        className="max-w-lg w-full"
        confirmButtonType={ButtonType.DELETE}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}

export default DashboardListForm
