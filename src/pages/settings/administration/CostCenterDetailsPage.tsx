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

import { useCallback, useEffect, useState } from 'react'

import Cross18Svg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import Spinner from '@/components/Spinner'
import { ButtonSize, ButtonType, InfoWarningType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import CostCenterFormPopup from '@/pages/settings/administration/components/CostCenterFormPopup'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { costCentersStore } from '@/store/costCenters'
import { CostCenterDetail } from '@/types/entity/costCenter'
import toaster from '@/utils/toaster'
import { formatDate } from '@/utils/utils'

import CostCenterProjectsManager from './projectsManagement/CostCenterProjectsManager'

const CostCenterDetailsPage = () => {
  const router = useVueRouter()
  const costCenterId = router.params.costCenterId as string
  const [costCenter, setCostCenter] = useState<CostCenterDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false)
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false)

  const loadCostCenter = useCallback(async () => {
    setLoading(true)
    try {
      const data = await costCentersStore.getCostCenter(costCenterId)
      setCostCenter(data)
    } catch (error) {
      console.error('Failed to load cost center:', error)
      setCostCenter(null)
    } finally {
      setLoading(false)
    }
  }, [costCenterId])

  useEffect(() => {
    loadCostCenter()
  }, [loadCostCenter])

  const handleBack = useCallback(() => {
    router.push({ name: 'cost-centers-management' })
  }, [router])

  const handleSaveCostCenter = async (payload: { description?: string }) => {
    if (!costCenter) return

    await costCentersStore.updateCostCenter(costCenter.id, {
      description: payload.description,
    })
    toaster.info(`Cost center ${costCenter.name} updated successfully`)
    await loadCostCenter()
  }

  const handleDeleteCostCenter = async () => {
    if (!costCenter) return

    await costCentersStore.deleteCostCenter(costCenter.id)
    toaster.info(`Cost center ${costCenter.name} deleted successfully`)
    router.push({ name: 'cost-centers-management' })
  }

  if (loading) {
    return (
      <SettingsLayout
        contentTitle="Cost center details"
        onBack={handleBack}
        content={
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        }
      />
    )
  }

  if (!costCenter) {
    return (
      <SettingsLayout
        contentTitle="Cost center details"
        onBack={handleBack}
        content={<div className="pt-6 text-text-quaternary">Cost center not found</div>}
      />
    )
  }

  return (
    <>
      <SettingsLayout
        contentTitle={costCenter.name}
        onBack={handleBack}
        rightContent={
          <div className="flex gap-3">
            <Button size={ButtonSize.MEDIUM} onClick={() => setIsEditPopupVisible(true)}>
              Edit Cost Center
            </Button>
            <Button
              size={ButtonSize.MEDIUM}
              type={ButtonType.DELETE}
              onClick={() => setIsDeletePopupVisible(true)}
              disabled={costCenter.project_count > 0}
            >
              Delete
            </Button>
          </div>
        }
        content={
          <div className="flex flex-col gap-6 pt-6 pb-8">
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
                <div className="text-xs text-text-quaternary mb-2">Description</div>
                <div className="text-sm text-text-primary whitespace-pre-wrap">
                  {costCenter.description || '-'}
                </div>
              </div>

              <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Projects</div>
                    <div>{costCenter.project_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Created by</div>
                    <div>{costCenter.created_by || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-text-quaternary mb-1">Created at</div>
                    <div>{formatDate(costCenter.created_at)}</div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="text-sm font-semibold text-text-primary mb-3">Linked projects</div>
              <CostCenterProjectsManager
                costCenterId={costCenter.id}
                projects={costCenter.projects}
                onProjectsChanged={loadCostCenter}
              />
            </section>
          </div>
        }
      />

      <CostCenterFormPopup
        visible={isEditPopupVisible}
        mode="edit"
        costCenter={costCenter}
        onClose={() => setIsEditPopupVisible(false)}
        onSubmit={handleSaveCostCenter}
      />

      <ConfirmationModal
        visible={isDeletePopupVisible}
        onCancel={() => setIsDeletePopupVisible(false)}
        header="Delete Cost Center?"
        message={`Are you sure you want to delete "${costCenter.name}"?`}
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

export default CostCenterDetailsPage
