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

import ConfirmationModal from '@/components/ConfirmationModal'
import DropdownButton from '@/components/DropdownButton/DropdownButton'
import Spinner from '@/components/Spinner'
import UnifiedProjectBudgetModal from '@/pages/settings/administration/components/UnifiedProjectBudgetModal'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { BudgetCategory } from '@/types/entity/budget'
import { ProjectBudget } from '@/types/entity/projectBudget'
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

  const [unifiedModalVisible, setUnifiedModalVisible] = useState(false)

  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [groupActionRunning, setGroupActionRunning] = useState(false)
  const [groupConfirmAction, setGroupConfirmAction] = useState<
    'reset' | 'rebalance' | 'delete' | null
  >(null)

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const [data, plans] = await Promise.all([
        projectBudgetsStore.listProjectBudgets({ projectName }),
        projectBudgetsStore.listProjectBudgetGroups(projectName),
      ])
      setBudgets(data)
      onBudgetsChanged?.(data)
      const activeGroup = plans.find((p) => !p.deleted_at)
      setCurrentGroupId(activeGroup?.group_id ?? null)
    } catch {
      // error already handled by store (toaster)
    } finally {
      setLoading(false)
    }
  }, [projectName, onBudgetsChanged])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const handleGroupReset = useCallback(async () => {
    if (!currentGroupId) return
    setGroupActionRunning(true)
    try {
      await projectBudgetsStore.resetProjectBudgetGroup(currentGroupId)
      toaster.info('Project budget reset')
      await loadBudgets()
    } catch {
      // error already handled by store
    } finally {
      setGroupActionRunning(false)
      setGroupConfirmAction(null)
    }
  }, [currentGroupId, loadBudgets])

  const handleDelete = useCallback(async () => {
    if (!currentGroupId) return
    setGroupActionRunning(true)
    try {
      await projectBudgetsStore.deleteProjectBudgetGroup(currentGroupId)
      toaster.info('Project budget deleted')
      await loadBudgets()
    } catch {
      // error already handled by store
    } finally {
      setGroupActionRunning(false)
      setGroupConfirmAction(null)
    }
  }, [currentGroupId, loadBudgets])

  const handleGroupRebalance = useCallback(async () => {
    if (!currentGroupId) return
    setGroupActionRunning(true)
    try {
      await projectBudgetsStore.rebalanceProjectBudgetGroup(currentGroupId)
      toaster.info('Member allocations rebalanced')
      await loadBudgets()
    } catch {
      // error already handled by store
    } finally {
      setGroupActionRunning(false)
      setGroupConfirmAction(null)
    }
  }, [currentGroupId, loadBudgets])

  const manageItems = useMemo(
    () => [
      {
        label: budgets.length > 0 ? 'Edit Budget' : 'Create Budget',
        onClick: () => setUnifiedModalVisible(true),
      },
      ...(currentGroupId
        ? [
            { label: 'Reset', onClick: () => setGroupConfirmAction('reset' as const) },
            { label: 'Rebalance', onClick: () => setGroupConfirmAction('rebalance' as const) },
          ]
        : []),
      ...(budgets.length > 0
        ? [{ label: 'Delete', onClick: () => setGroupConfirmAction('delete' as const) }]
        : []),
    ],
    [currentGroupId, budgets.length]
  )

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

  return (
    <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-text-primary">Budgets</div>
        {isManageMode && (
          <DropdownButton
            label={budgets.length > 0 ? 'Manage Budget' : 'Create Budget'}
            size="medium"
            items={manageItems}
            disabled={groupActionRunning}
          />
        )}
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
                  mode="view"
                  budget={budget}
                  spendingRow={spendingByBudgetId[budget.budget_id] ?? null}
                />
              )
            }
            return (
              <ProjectBudgetCard key={category} variant="empty" mode="view" category={category} />
            )
          })}
        </div>
      )}

      <UnifiedProjectBudgetModal
        visible={unifiedModalVisible}
        onHide={() => setUnifiedModalVisible(false)}
        projectName={projectName}
        onSaved={loadBudgets}
        forceCreate={budgets.length === 0}
      />

      {isManageMode && (
        <>
          <ConfirmationModal
            visible={groupConfirmAction === 'reset'}
            header="Reset Project Budget?"
            message="Resets spend counters and reset window for every category. Continue?"
            confirmText="Reset"
            onConfirm={handleGroupReset}
            onCancel={() => setGroupConfirmAction(null)}
            limitWidth
          />
          <ConfirmationModal
            visible={groupConfirmAction === 'rebalance'}
            header="Rebalance Project Budget?"
            message="Recalculates member allocations across every category. Continue?"
            confirmText="Rebalance"
            onConfirm={handleGroupRebalance}
            onCancel={() => setGroupConfirmAction(null)}
            limitWidth
          />
          <ConfirmationModal
            visible={groupConfirmAction === 'delete'}
            header="Delete Project Budgets?"
            message="All budget categories for this project will be permanently deleted. Continue?"
            confirmText="Delete"
            onConfirm={handleDelete}
            onCancel={() => setGroupConfirmAction(null)}
            limitWidth
          />
        </>
      )}
    </div>
  )
}

export default ProjectBudgetsSection
