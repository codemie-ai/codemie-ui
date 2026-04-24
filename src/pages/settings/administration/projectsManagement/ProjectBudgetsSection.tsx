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

import { FC, ReactNode, useCallback, useEffect, useState } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import ProjectBudgetModal from '@/pages/settings/administration/components/ProjectBudgetModal'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { BudgetCategory } from '@/types/entity/budget'
import {
  ProjectBudget,
  ProjectBudgetCreatePayload,
  ProjectBudgetUpdatePayload,
} from '@/types/entity/projectBudget'
import { ProjectSpendingWidgetRow } from '@/types/entity/projectManagement'
import toaster from '@/utils/toaster'

import ProjectBudgetCard from './components/ProjectBudgetCard'

const BUDGET_CATEGORIES: BudgetCategory[] = ['platform', 'cli', 'premium_models']

interface ProjectBudgetsSectionProps {
  projectName: string
  spendingRows?: ProjectSpendingWidgetRow[]
  onBudgetsChanged?: (budgets: ProjectBudget[]) => void
  mode: 'manage' | 'view'
}

const ProjectBudgetsSection: FC<ProjectBudgetsSectionProps> = ({
  projectName,
  spendingRows,
  onBudgetsChanged,
  mode,
}) => {
  const isManageMode = mode === 'manage'
  const [budgets, setBudgets] = useState<ProjectBudget[]>([])
  const [loading, setLoading] = useState(false)

  const [modalVisible, setModalVisible] = useState(false)
  const [editingBudget, setEditingBudget] = useState<ProjectBudget | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)

  const [deletingBudget, setDeletingBudget] = useState<ProjectBudget | null>(null)

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await projectBudgetsStore.listProjectBudgets({ projectName })
      setBudgets(data)
      onBudgetsChanged?.(data)
    } catch {
      // error already handled by store (toaster)
    } finally {
      setLoading(false)
    }
  }, [projectName, onBudgetsChanged])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const handleAddBudget = useCallback(
    (category: BudgetCategory) => {
      if (!isManageMode) return
      setEditingBudget(null)
      setSelectedCategory(category)
      setModalVisible(true)
    },
    [isManageMode]
  )

  const handleEdit = useCallback(
    (budget: ProjectBudget) => {
      if (!isManageMode) return
      setEditingBudget(budget)
      setSelectedCategory(null)
      setModalVisible(true)
    },
    [isManageMode]
  )

  const handleModalHide = useCallback(() => {
    setModalVisible(false)
    setEditingBudget(null)
    setSelectedCategory(null)
  }, [])

  const handleCreateSubmit = useCallback(
    async (payload: ProjectBudgetCreatePayload) => {
      await projectBudgetsStore.createProjectBudget(payload)
      toaster.info('Project budget created successfully')
      setModalVisible(false)
      setSelectedCategory(null)
      await loadBudgets()
    },
    [loadBudgets]
  )

  const handleEditSubmit = useCallback(
    async (payload: ProjectBudgetUpdatePayload) => {
      if (!editingBudget) return
      await projectBudgetsStore.updateProjectBudget(editingBudget.budget_id, payload)
      toaster.info('Project budget updated successfully')
      setModalVisible(false)
      setEditingBudget(null)
      await loadBudgets()
    },
    [editingBudget, loadBudgets]
  )

  const handleReset = useCallback(
    async (budget: ProjectBudget) => {
      try {
        await projectBudgetsStore.resetProjectBudget(budget.budget_id)
        toaster.info('Project budget reset successfully')
        await loadBudgets()
      } catch {
        // error already handled by store
      }
    },
    [loadBudgets]
  )

  const handleSync = useCallback(
    async (budget: ProjectBudget) => {
      try {
        await projectBudgetsStore.resetProjectBudget(budget.budget_id)
        toaster.info('Project budget synced successfully')
        await loadBudgets()
      } catch {
        // error already handled by store
      }
    },
    [loadBudgets]
  )

  const handleRebalance = useCallback(
    async (budget: ProjectBudget) => {
      try {
        await projectBudgetsStore.rebalanceProjectBudget(budget.budget_id)
        toaster.info('Member allocations rebalanced successfully')
        await loadBudgets()
      } catch {
        // error already handled by store
      }
    },
    [loadBudgets]
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingBudget) return
    try {
      await projectBudgetsStore.deleteProjectBudget(deletingBudget.budget_id)
      toaster.info('Project budget deleted successfully')
      setDeletingBudget(null)
      await loadBudgets()
    } catch {
      // error already handled by store
    }
  }, [deletingBudget, loadBudgets])

  const spendingByBudgetId = (spendingRows ?? []).reduce<Record<string, ProjectSpendingWidgetRow>>(
    (acc, row) => {
      acc[row.budget_id] = row
      return acc
    },
    {}
  )

  const budgetByCategory = BUDGET_CATEGORIES.reduce<Record<BudgetCategory, ProjectBudget | null>>(
    (acc, category) => {
      acc[category] = budgets.find((b) => b.budget_category === category) ?? null
      return acc
    },
    { platform: null, cli: null, premium_models: null }
  )

  const assignedCategories = BUDGET_CATEGORIES.filter(
    (category) => budgetByCategory[category] !== null
  )

  let budgetModal: ReactNode = null
  if (isManageMode && editingBudget) {
    budgetModal = (
      <ProjectBudgetModal
        visible={modalVisible}
        projectName={projectName}
        budget={editingBudget}
        onHide={handleModalHide}
        onSubmit={handleEditSubmit}
      />
    )
  } else if (isManageMode) {
    budgetModal = (
      <ProjectBudgetModal
        visible={modalVisible}
        projectName={projectName}
        preselectedCategory={selectedCategory}
        assignedCategories={assignedCategories}
        onHide={handleModalHide}
        onSubmit={handleCreateSubmit}
      />
    )
  }

  return (
    <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <div className="mb-4">
        <div className="text-sm font-medium text-text-primary">Budgets</div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {BUDGET_CATEGORIES.map((category) => {
            const budget = budgetByCategory[category]
            if (budget) {
              return (
                <ProjectBudgetCard
                  key={category}
                  variant="assigned"
                  mode={mode}
                  budget={budget}
                  spendingRow={spendingByBudgetId[budget.budget_id] ?? null}
                  onEdit={handleEdit}
                  onReset={handleReset}
                  onDelete={setDeletingBudget}
                  onSync={handleSync}
                  onRebalance={handleRebalance}
                />
              )
            }
            return (
              <ProjectBudgetCard
                key={category}
                variant="empty"
                mode={mode}
                category={category}
                onAddBudget={handleAddBudget}
              />
            )
          })}
        </div>
      )}

      {budgetModal}

      {isManageMode ? (
        <ConfirmationModal
          visible={!!deletingBudget}
          header="Delete Project Budget?"
          message={`Are you sure you want to delete "${deletingBudget?.name}"? This will permanently remove the budget and all member assignments.`}
          confirmText="Delete"
          confirmButtonType={ButtonType.DELETE}
          onCancel={() => setDeletingBudget(null)}
          onConfirm={handleDeleteConfirm}
          limitWidth
        />
      ) : null}
    </div>
  )
}

export default ProjectBudgetsSection
