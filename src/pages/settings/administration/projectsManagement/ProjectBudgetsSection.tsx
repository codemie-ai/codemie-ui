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

import { FC, useCallback, useEffect, useState } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
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

  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [planActionRunning, setPlanActionRunning] = useState(false)
  const [planConfirmAction, setPlanConfirmAction] = useState<'reset' | 'rebalance' | null>(null)

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const [data, plans] = await Promise.all([
        projectBudgetsStore.listProjectBudgets({ projectName }),
        projectBudgetsStore.listProjectBudgetPlans(projectName),
      ])
      setBudgets(data)
      onBudgetsChanged?.(data)
      const activePlan = plans.find((p) => !p.deleted_at)
      setCurrentPlanId(activePlan?.plan_id ?? null)
    } catch {
      // error already handled by store (toaster)
    } finally {
      setLoading(false)
    }
  }, [projectName, onBudgetsChanged])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const handlePlanReset = useCallback(async () => {
    if (!currentPlanId) return
    setPlanActionRunning(true)
    try {
      await projectBudgetsStore.resetProjectBudgetPlan(currentPlanId)
      toaster.info('Project budget plan reset')
      await loadBudgets()
    } catch {
      // error already handled by store
    } finally {
      setPlanActionRunning(false)
      setPlanConfirmAction(null)
    }
  }, [currentPlanId, loadBudgets])

  const handlePlanRebalance = useCallback(async () => {
    if (!currentPlanId) return
    setPlanActionRunning(true)
    try {
      await projectBudgetsStore.rebalanceProjectBudgetPlan(currentPlanId)
      toaster.info('Member allocations rebalanced')
      await loadBudgets()
    } catch {
      // error already handled by store
    } finally {
      setPlanActionRunning(false)
      setPlanConfirmAction(null)
    }
  }, [currentPlanId, loadBudgets])

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!currentPlanId || planActionRunning}
              onClick={() => setPlanConfirmAction('reset')}
              title={currentPlanId ? 'Reset spend counters' : 'Save a plan first'}
              className="text-xs text-text-quaternary border border-border-structural rounded px-2.5 py-1 hover:bg-surface-base-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="button"
              disabled={!currentPlanId || planActionRunning}
              onClick={() => setPlanConfirmAction('rebalance')}
              title={currentPlanId ? 'Rebalance member allocations' : 'Save a plan first'}
              className="text-xs text-text-quaternary border border-border-structural rounded px-2.5 py-1 hover:bg-surface-base-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rebalance
            </button>
            <button
              type="button"
              onClick={() => setUnifiedModalVisible(true)}
              className="text-xs text-text-quaternary border border-border-structural rounded px-2.5 py-1 hover:bg-surface-base-primary transition-colors"
            >
              Manage Budget
            </button>
          </div>
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
              <ProjectBudgetCard
                key={category}
                variant="empty"
                mode="view"
                category={category}
              />
            )
          })}
        </div>
      )}

      <UnifiedProjectBudgetModal
        visible={unifiedModalVisible}
        onHide={() => setUnifiedModalVisible(false)}
        projectName={projectName}
        onSaved={loadBudgets}
      />

      {isManageMode && (
        <>
          <ConfirmationModal
            visible={planConfirmAction === 'reset'}
            header="Reset Project Budget Plan?"
            message="Resets spend counters and reset window for every category in this plan. Continue?"
            confirmText="Reset"
            onConfirm={handlePlanReset}
            onCancel={() => setPlanConfirmAction(null)}
            limitWidth
          />
          <ConfirmationModal
            visible={planConfirmAction === 'rebalance'}
            header="Rebalance Project Budget Plan?"
            message="Recalculates member allocations across every category in this plan. Continue?"
            confirmText="Rebalance"
            onConfirm={handlePlanRebalance}
            onCancel={() => setPlanConfirmAction(null)}
            limitWidth
          />
        </>
      )}
    </div>
  )
}

export default ProjectBudgetsSection
