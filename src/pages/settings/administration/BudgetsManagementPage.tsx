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

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import EditSvg from '@/assets/icons/edit.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import Select from '@/components/form/Select/Select'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import Table from '@/components/Table'
import { ButtonSize, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import BudgetModal from '@/pages/settings/administration/components/BudgetModal'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { budgetsStore } from '@/store/budgets'
import { userStore } from '@/store/user'
import {
  BUDGET_CATEGORY_OPTIONS,
  Budget,
  BudgetCategory,
  BudgetPayload,
  getBudgetCategoryLabel,
} from '@/types/entity/budget'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatDateTime } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { displayValue } from '@/utils/utils'

const columnDefinitions: ColumnDefinition[] = [
  {
    key: 'budget_id',
    label: 'Budget ID',
    type: DefinitionTypes.String,
    headClassNames: 'w-[16%]',
  },
  {
    key: 'name',
    label: 'Name',
    type: DefinitionTypes.String,
    headClassNames: 'w-[18%]',
  },
  {
    key: 'budget_category',
    label: 'Category',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[12%]',
  },
  {
    key: 'limits',
    label: 'Limits',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[14%]',
  },
  {
    key: 'budget_duration',
    label: 'Duration',
    type: DefinitionTypes.String,
    headClassNames: 'w-[10%]',
  },
  {
    key: 'budget_reset_at',
    label: 'Reset',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[14%]',
  },
  {
    key: 'updated_at',
    label: 'Updated',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[12%]',
  },
  {
    key: 'actions',
    label: 'Actions',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[6%]',
  },
]

const categoryFilterOptions = [{ label: 'All categories', value: '' }, ...BUDGET_CATEGORY_OPTIONS]

const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const BudgetsManagementPage: FC = () => {
  const navigate = useNavigate()
  const { user: currentUser } = useSnapshot(userStore)
  const { budgets, pagination, loading, syncing } = useSnapshot(budgetsStore)
  const isMaintainer = currentUser?.isMaintainer ?? false
  const [category, setCategory] = useState<BudgetCategory | ''>('')
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (currentUser && !isMaintainer) {
      toaster.error('Access denied. Only maintainers can manage budgets.')
      navigate('/settings/administration')
    }
  }, [currentUser, isMaintainer, navigate])

  const loadBudgets = useCallback(
    (page?: number, perPage?: number) => {
      budgetsStore
        .listBudgets({
          page: page ?? budgetsStore.pagination.page,
          perPage: perPage ?? budgetsStore.pagination.perPage,
          category: category || null,
        })
        .catch((error) => {
          console.error('Failed to load budgets:', error)
        })
    },
    [category]
  )

  useEffect(() => {
    if (!isMaintainer) return
    loadBudgets(0)
  }, [category, isMaintainer, loadBudgets])

  const handleCreate = useCallback(() => {
    setEditingBudget(null)
    setShowModal(true)
  }, [])

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget)
    setShowModal(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setEditingBudget(null)
    setShowModal(false)
  }, [])

  const handleModalSubmit = useCallback(
    async (payload: BudgetPayload) => {
      const isEdit = !!editingBudget

      if (isEdit) {
        await budgetsStore.updateBudget(editingBudget.budget_id, {
          name: payload.name,
          description: payload.description,
          soft_budget: payload.soft_budget,
          max_budget: payload.max_budget,
          budget_duration: payload.budget_duration,
          budget_category: payload.budget_category,
        })
        toaster.info('Budget updated successfully')
      } else {
        await budgetsStore.createBudget(payload)
        toaster.info('Budget created successfully')
      }

      handleModalClose()
      loadBudgets()
    },
    [editingBudget, handleModalClose, loadBudgets]
  )

  const handleSync = useCallback(async () => {
    try {
      const result = await budgetsStore.syncBudgets()
      toaster.info(
        `Synced ${result.total_in_litellm} budgets: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged`
      )
      loadBudgets()
    } catch (error) {
      console.error('Failed to sync budgets:', error)
    }
  }, [loadBudgets])

  const customRenderColumns = useMemo(
    () => ({
      budget_category: (item: Budget) => (
        <span className="text-text-primary">{getBudgetCategoryLabel(item.budget_category)}</span>
      ),
      limits: (item: Budget) => (
        <div className="flex flex-col">
          <span className="text-text-primary">{formatCurrency(item.max_budget)}</span>
          <span className="text-xs text-text-quaternary">
            Soft {formatCurrency(item.soft_budget)}
          </span>
        </div>
      ),
      budget_reset_at: (item: Budget) => (
        <span className="whitespace-nowrap text-text-primary">
          {displayValue(formatDateTime(item.budget_reset_at))}
        </span>
      ),
      updated_at: (item: Budget) => (
        <span className="whitespace-nowrap text-text-primary">
          {displayValue(formatDateTime(item.updated_at || item.created_at))}
        </span>
      ),
      actions: (item: Budget) =>
        item.is_preconfigured ? null : (
          <div className="flex justify-end">
            <NavigationMore
              hideOnClickInside
              items={[{ title: 'Edit', icon: <EditSvg />, onClick: () => handleEdit(item) }]}
            />
          </div>
        ),
    }),
    [handleEdit]
  )

  const rightContent = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button onClick={handleSync} size={ButtonSize.MEDIUM} variant="tertiary" disabled={syncing}>
          <RefreshSvg className="w-4 h-4" />
          Sync
        </Button>
        <Button onClick={handleCreate} size={ButtonSize.MEDIUM}>
          <PlusFilledSvg />
          Create
        </Button>
      </div>
    ),
    [handleCreate, handleSync, syncing]
  )

  const content = (
    <div className="flex flex-col h-full pt-4">
      <div className="mb-4 w-56">
        <Select
          label="Category"
          value={category}
          options={categoryFilterOptions}
          onChangeValue={(value) => setCategory((value || '') as BudgetCategory | '')}
        />
      </div>

      <Table
        items={budgets || []}
        columnDefinitions={columnDefinitions}
        customRenderColumns={customRenderColumns}
        loading={loading}
        pagination={{
          page: pagination.page,
          totalPages: pagination.totalPages,
          perPage: pagination.perPage,
        }}
        onPaginationChange={(page, perPage) => loadBudgets(page, perPage ?? pagination.perPage)}
        perPageOptions={DECIMAL_PAGINATION_OPTIONS}
      />

      <BudgetModal
        visible={showModal}
        budget={editingBudget}
        onHide={handleModalClose}
        onSubmit={handleModalSubmit}
      />
    </div>
  )

  if (currentUser && !isMaintainer) {
    return null
  }

  return (
    <SettingsLayout
      contentTitle="Budgets management"
      content={content}
      rightContent={rightContent}
    />
  )
}

export default BudgetsManagementPage
