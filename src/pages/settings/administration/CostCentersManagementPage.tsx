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

import { useCallback, useEffect, useMemo, useState } from 'react'

import Cross18Svg from '@/assets/icons/cross.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import ViewSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import NavigationMore, { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import Table from '@/components/Table'
import { ButtonSize, ButtonType, DECIMAL_PAGINATION_OPTIONS, InfoWarningType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import CostCenterFormPopup from '@/pages/settings/administration/components/CostCenterFormPopup'
import NameLinkCell from '@/pages/settings/administration/components/NameLinkCell'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { costCentersStore } from '@/store/costCenters'
import { PaginatedResponse } from '@/types/common'
import { CostCenterListItem } from '@/types/entity/costCenter'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import toaster from '@/utils/toaster'
import { displayValue } from '@/utils/utils'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.Custom, headClassNames: 'w-[22%]' },
  {
    key: 'description',
    label: 'Description',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[36%]',
    maxLength: 96,
  },
  {
    key: 'project_count',
    label: 'Projects',
    type: DefinitionTypes.String,
    headClassNames: 'w-[10%]',
  },
  {
    key: 'created_by',
    label: 'Created by',
    type: DefinitionTypes.String,
    headClassNames: 'w-[16%]',
  },
  { key: 'created_at', label: 'Created at', type: DefinitionTypes.Date, headClassNames: 'w-[10%]' },
  { key: 'actions', label: 'Actions', type: DefinitionTypes.Custom, headClassNames: 'w-[6%]' },
]

const initialResponse: PaginatedResponse<CostCenterListItem> = {
  data: [],
  pagination: {
    page: 0,
    per_page: 20,
    total: 0,
    pages: 0,
  },
}

const CostCentersManagementPage = () => {
  const router = useVueRouter()
  const [response, setResponse] = useState(initialResponse)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [perPage, setPerPage] = useState(20)
  const [isCreatePopupVisible, setIsCreatePopupVisible] = useState(false)
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenterListItem | null>(null)
  const [deletingCostCenter, setDeletingCostCenter] = useState<CostCenterListItem | null>(null)

  const loadCostCenters = useCallback(async (nextPage: number, nextPerPage: number) => {
    setLoading(true)
    try {
      const data = await costCentersStore.getCostCenters({
        page: nextPage,
        per_page: nextPerPage,
      })
      setResponse(data)
    } catch (error) {
      console.error('Failed to load cost centers:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCostCenters(page, perPage)
  }, [loadCostCenters, page, perPage])

  const handlePaginationChange = useCallback((nextPage: number, nextPerPage?: number) => {
    setPage(nextPage)
    if (nextPerPage) {
      setPerPage(nextPerPage)
    }
  }, [])

  const handleCostCenterOpen = useCallback(
    (costCenterId: string) => {
      router.push({
        name: 'cost-centers-management-detail',
        params: { costCenterId },
      })
    },
    [router]
  )

  const handleCreateCostCenter = async (payload: { name: string; description?: string }) => {
    await costCentersStore.createCostCenter(payload)
    toaster.info(`Cost center ${payload.name} created successfully`)
    setPage(0)
    await loadCostCenters(0, perPage)
  }

  const handleUpdateCostCenter = async (payload: { description?: string }) => {
    if (!editingCostCenter) return

    await costCentersStore.updateCostCenter(editingCostCenter.id, {
      description: payload.description,
    })
    toaster.info(`Cost center ${editingCostCenter.name} updated successfully`)
    setEditingCostCenter(null)
    await loadCostCenters(page, perPage)
  }

  const handleDeleteCostCenter = async () => {
    if (!deletingCostCenter) return

    await costCentersStore.deleteCostCenter(deletingCostCenter.id)
    toaster.info(`Cost center ${deletingCostCenter.name} deleted successfully`)
    setDeletingCostCenter(null)
    await loadCostCenters(page, perPage)
  }

  const customRenderColumns = useMemo(
    () => ({
      name: (costCenter: CostCenterListItem) => (
        <NameLinkCell onClick={() => handleCostCenterOpen(costCenter.id)}>
          {costCenter.name}
        </NameLinkCell>
      ),
      description: (costCenter: CostCenterListItem) => (
        <span className="text-text-quaternary line-clamp-2">
          {displayValue(costCenter.description)}
        </span>
      ),
      actions: (costCenter: CostCenterListItem) => {
        const menuItems: NavigationItem[] = [
          {
            title: 'View',
            icon: <ViewSvg className="w-[18px] h-[18px]" />,
            onClick: () => handleCostCenterOpen(costCenter.id),
          },
          {
            title: 'Edit',
            icon: <EditSvg className="w-[18px] h-[18px]" />,
            onClick: () => setEditingCostCenter(costCenter),
          },
          {
            title: 'Delete',
            icon: <DeleteSvg className="w-[18px] h-[18px]" />,
            onClick: () => setDeletingCostCenter(costCenter),
            disabled: costCenter.project_count > 0,
            tooltip:
              costCenter.project_count > 0
                ? 'Linked projects must be removed before deletion'
                : undefined,
          },
        ]

        return (
          <div className="flex justify-end">
            <NavigationMore hideOnClickInside items={menuItems} />
          </div>
        )
      },
    }),
    [handleCostCenterOpen]
  )

  const headerActions = useMemo(
    () => (
      <Button onClick={() => setIsCreatePopupVisible(true)} size={ButtonSize.MEDIUM}>
        <PlusFilledSvg />
        Create
      </Button>
    ),
    []
  )

  return (
    <>
      <SettingsLayout
        contentTitle="Cost centers management"
        rightContent={headerActions}
        content={
          <div className="flex flex-col h-full pt-6 gap-4">
            <Table
              items={response.data}
              columnDefinitions={columnDefinitions}
              customRenderColumns={customRenderColumns}
              loading={loading}
              pagination={{
                page: response.pagination.page,
                perPage,
                totalPages: Math.max(response.pagination.pages, 1),
              }}
              perPageOptions={DECIMAL_PAGINATION_OPTIONS}
              onPaginationChange={handlePaginationChange}
            />
          </div>
        }
      />

      <CostCenterFormPopup
        visible={isCreatePopupVisible}
        mode="create"
        onClose={() => setIsCreatePopupVisible(false)}
        onSubmit={handleCreateCostCenter}
      />

      <CostCenterFormPopup
        visible={!!editingCostCenter}
        mode="edit"
        costCenter={editingCostCenter as any}
        onClose={() => setEditingCostCenter(null)}
        onSubmit={handleUpdateCostCenter as any}
      />

      <ConfirmationModal
        visible={!!deletingCostCenter}
        onCancel={() => setDeletingCostCenter(null)}
        header="Delete Cost Center?"
        message={`Are you sure you want to delete "${deletingCostCenter?.name}"?`}
        confirmText="Delete"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<Cross18Svg className="w-4 mr-px" />}
        onConfirm={handleDeleteCostCenter}
      >
        <InfoWarning
          type={InfoWarningType.INFO}
          message="This action cannot be undone."
          className="mt-4"
        />
      </ConfirmationModal>
    </>
  )
}

export default CostCentersManagementPage
