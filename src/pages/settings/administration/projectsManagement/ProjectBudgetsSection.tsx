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
import Hint from '@/components/Hint'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { PROJECTS_MANAGEMENT_MEMBERS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'
import UnifiedProjectBudgetModal from '@/pages/settings/administration/components/UnifiedProjectBudgetModal'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { BudgetCategory, getBudgetCategoryLabel } from '@/types/entity/budget'
import { ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectBudgetGroup } from '@/types/entity/projectBudgetGroup'
import {
  ProjectDetail,
  ProjectSpendingSummary,
  ProjectSpendingWidgetRow,
} from '@/types/entity/projectManagement'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { formatDateTime } from '@/utils/helpers'
import toaster from '@/utils/toaster'

import {
  formatCurrency,
  getSpendColor,
  getSpendPercentage,
  SPENDING_DANGER_THRESHOLD,
  SPENDING_WARNING_THRESHOLD,
} from './components/spendPresentation'

const BUDGET_CATEGORIES: BudgetCategory[] = ['platform', 'cli', 'premium_models']

interface BudgetCardData {
  id: string
  category: BudgetCategory
  maxBudget: number | null
  softBudget: number | null
  spent: number | null
  usagePercentage: number | null
  remaining: number | null
  overrideCount: number
  memberCount: number | null
  allocatedMemberBudgetTotal: number | null
  /** Spend left behind by a budget that was later removed or redistributed. */
  unassignedSpend: number | null
}

const formatResetPeriod = (duration: string | null | undefined): string => {
  if (!duration) return '—'
  const labels: Record<string, string> = { '1d': 'Daily', '7d': 'Weekly', '30d': 'Monthly' }
  return `${labels[duration] ?? duration} · ${duration}`
}

const MemberAllocationSummary: FC<{ data: BudgetCardData }> = ({ data }) => (
  <span>
    {data.memberCount ?? 0} members · {formatCurrency(data.allocatedMemberBudgetTotal ?? 0)}{' '}
    allocated
  </span>
)

const OverridesSummary: FC<{ data: BudgetCardData; projectName: string }> = ({
  data,
  projectName,
}) => {
  const router = useVueRouter()
  if (!data.overrideCount) return <span className="text-text-quaternary">No user overrides</span>
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <span className="min-w-0 break-words text-text-primary">
        {data.overrideCount} user overrides
      </span>
      <button
        type="button"
        className="shrink-0 text-text-accent-status hover:text-text-accent-status-hover"
        onClick={() => router.push({ name: PROJECTS_MANAGEMENT_MEMBERS, params: { projectName } })}
      >
        View details
      </button>
    </div>
  )
}

const BudgetDetailCard: FC<{ data: BudgetCardData; projectName: string }> = ({
  data,
  projectName,
}) => {
  const spendColor = getSpendColor(data.usagePercentage)

  if (data.maxBudget == null) {
    return (
      <div className="flex min-h-[220px] min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
        <div className="text-sm font-medium text-text-primary">
          {getBudgetCategoryLabel(data.category)}
        </div>
        {data.unassignedSpend != null ? (
          <div className="flex flex-1 flex-col gap-2 text-xs">
            <div>
              <span className="text-text-quaternary">Spend</span>
              <span className="ml-2 text-text-primary">{formatCurrency(data.unassignedSpend)}</span>
            </div>
            <div>
              <span className="text-text-quaternary">Budget</span>
              <span className="ml-2 text-text-primary">
                not assigned
                <Hint
                  id={`budget-detail-card-not-assigned-${data.category}`}
                  hint="This category has no active budget, but spend from before it was removed or redistributed is still shown here."
                  position="bottom"
                />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-text-quaternary">
            — not assigned —
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-[220px] min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <div className="text-sm font-medium text-text-primary">
        {getBudgetCategoryLabel(data.category)}
      </div>
      <div>
        <div className="text-xs text-text-quaternary">Spend / hard limit</div>
        <div className="mt-1 whitespace-nowrap text-base">
          <span className="font-semibold" style={spendColor ? { color: spendColor } : undefined}>
            {formatCurrency(data.spent)}
          </span>
          <span className="font-normal text-text-primary"> / {formatCurrency(data.maxBudget)}</span>
        </div>
        {data.usagePercentage == null ? (
          <div className="mt-2 text-xs text-text-quaternary">—</div>
        ) : (
          <SpendingProgressBar
            percentage={data.usagePercentage}
            dangerThreshold={SPENDING_DANGER_THRESHOLD}
            warningThreshold={SPENDING_WARNING_THRESHOLD - 0.0001}
            className="mt-2 !gap-1"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <div className="text-text-quaternary">Remaining</div>
          <div className="mt-1 text-sm text-text-primary">{formatCurrency(data.remaining)}</div>
        </div>
        <div>
          <div className="text-text-quaternary">Soft limit</div>
          <div className="mt-1 text-sm text-text-primary">{formatCurrency(data.softBudget)}</div>
        </div>
      </div>
      <div className="mt-auto text-xs text-text-quaternary">
        <MemberAllocationSummary data={data} />
      </div>
      <div className="min-h-4 text-xs">
        <OverridesSummary data={data} projectName={projectName} />
      </div>
    </div>
  )
}

const budgetTableColumns: ColumnDefinition[] = [
  {
    label: 'Category',
    key: 'category',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[12%]',
  },
  {
    label: 'Spend / hard limit',
    key: 'spendHardLimit',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[17%]',
  },
  { label: 'Usage', key: 'usage', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
  { label: 'Remaining', key: 'remaining', type: DefinitionTypes.Custom, headClassNames: 'w-[10%]' },
  {
    label: 'Soft limit',
    key: 'softLimit',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[10%]',
  },
  {
    label: 'Member allocation',
    key: 'memberAllocation',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[18%]',
  },
  { label: 'Overrides', key: 'overrides', type: DefinitionTypes.Custom, headClassNames: 'w-[15%]' },
]

const renderCategoryCell = (row: BudgetCardData) => (
  <span
    className={row.maxBudget != null ? 'font-medium text-text-primary' : 'text-text-quaternary'}
  >
    {getBudgetCategoryLabel(row.category)}
  </span>
)

const renderSpendHardLimitCell = (row: BudgetCardData) => {
  const spendColor = getSpendColor(row.usagePercentage)
  if (row.maxBudget == null) return <span className="text-text-quaternary">—</span>
  return (
    <div className="whitespace-nowrap">
      <span className="font-semibold" style={spendColor ? { color: spendColor } : undefined}>
        {formatCurrency(row.spent)}
      </span>
      <span className="text-text-primary"> / {formatCurrency(row.maxBudget)}</span>
    </div>
  )
}

const renderUsageCell = (row: BudgetCardData) =>
  row.usagePercentage == null ? (
    <span className="text-text-quaternary">—</span>
  ) : (
    <SpendingProgressBar
      percentage={row.usagePercentage}
      dangerThreshold={SPENDING_DANGER_THRESHOLD}
      warningThreshold={SPENDING_WARNING_THRESHOLD - 0.0001}
      className="!gap-1 [&>span]:text-xs"
    />
  )

const renderMemberAllocationCell = (row: BudgetCardData) => (
  <div className="min-w-0 text-xs leading-5 text-text-quaternary">
    <MemberAllocationSummary data={row} />
  </div>
)

const renderOverridesCell = (row: BudgetCardData, projectName: string) => (
  <div className="min-w-0 text-xs">
    <OverridesSummary data={row} projectName={projectName} />
  </div>
)

const BudgetTableView: FC<{ data: BudgetCardData[]; projectName: string }> = ({
  data,
  projectName,
}) => (
  <Table<BudgetCardData>
    items={data}
    idPath="id"
    columnDefinitions={budgetTableColumns}
    customRenderColumns={{
      category: renderCategoryCell,
      spendHardLimit: renderSpendHardLimitCell,
      usage: renderUsageCell,
      remaining: (row) => formatCurrency(row.remaining),
      softLimit: (row) => formatCurrency(row.softBudget),
      memberAllocation: renderMemberAllocationCell,
      overrides: (row) => renderOverridesCell(row, projectName),
    }}
    tableClassName="mt-0 table-fixed [&_th]:whitespace-normal [&_th]:py-3 [&_td]:py-2.5"
  />
)

interface ProjectBudgetManagementControlProps {
  projectName: string
  hasBudget: boolean
  onSaved: () => void | Promise<void>
  project?: ProjectDetail | null
  /** Maintainers get full control; admins/project admins get distribution-only (EPMCDME-13962):
   * redistribute an existing budget's member split, but not create/reset/rebalance/delete it. */
  access: ProjectBudgetsAccess
  onProjectChanged?: () => void | Promise<void>
}

export const ProjectBudgetManagementControl: FC<ProjectBudgetManagementControlProps> = ({
  projectName,
  hasBudget,
  onSaved,
  project,
  access,
  onProjectChanged,
}) => {
  const hasFullAccess = access === 'full'
  const isDistributionOnly = access === 'distribution'
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [groupActionRunning, setGroupActionRunning] = useState(false)
  const [groupConfirmAction, setGroupConfirmAction] = useState<
    'reset' | 'rebalance' | 'delete' | null
  >(null)
  const [unifiedModalVisible, setUnifiedModalVisible] = useState(false)

  const loadGroup = useCallback(async () => {
    const plans = await projectBudgetsStore.listProjectBudgetGroups(projectName)
    setCurrentGroupId(plans.find((plan) => !plan.deleted_at)?.group_id ?? null)
  }, [projectName])

  useEffect(() => {
    loadGroup().catch(() => setCurrentGroupId(null))
  }, [loadGroup, hasBudget])

  const runGroupAction = useCallback(
    async (action: 'reset' | 'rebalance' | 'delete') => {
      if (!currentGroupId) return
      setGroupActionRunning(true)
      try {
        if (action === 'reset') {
          await projectBudgetsStore.resetProjectBudgetGroup(currentGroupId)
          toaster.info('Project budget reset')
        } else if (action === 'rebalance') {
          await projectBudgetsStore.rebalanceProjectBudgetGroup(currentGroupId)
          toaster.info('Member allocations rebalanced')
        } else {
          await projectBudgetsStore.deleteProjectBudgetGroup(currentGroupId)
          toaster.info('Project budget deleted')
        }
        await onSaved()
        await loadGroup()
      } catch {
        // error already handled by store
      } finally {
        setGroupActionRunning(false)
        setGroupConfirmAction(null)
      }
    },
    [currentGroupId, loadGroup, onSaved]
  )

  const manageItems = useMemo(
    () => [
      {
        label: hasBudget ? 'Edit Budget' : 'Create Budget',
        onClick: () => setUnifiedModalVisible(true),
      },
      ...(hasFullAccess && currentGroupId
        ? [
            { label: 'Reset', onClick: () => setGroupConfirmAction('reset' as const) },
            { label: 'Rebalance', onClick: () => setGroupConfirmAction('rebalance' as const) },
          ]
        : []),
      ...(hasFullAccess && hasBudget
        ? [{ label: 'Delete', onClick: () => setGroupConfirmAction('delete' as const) }]
        : []),
    ],
    [hasFullAccess, currentGroupId, hasBudget]
  )

  // Distribution-only access can redistribute an existing budget, never create one.
  const showBudgetActions = hasFullAccess || (isDistributionOnly && hasBudget)
  if (!showBudgetActions) return null

  return (
    <>
      <DropdownButton
        label={hasBudget ? 'Manage Budget' : 'Create Budget'}
        size="medium"
        items={manageItems}
        disabled={groupActionRunning}
      />
      <UnifiedProjectBudgetModal
        visible={unifiedModalVisible}
        onHide={() => setUnifiedModalVisible(false)}
        projectName={projectName}
        project={project}
        distributionOnly={isDistributionOnly}
        canManageBudgets={hasFullAccess}
        onSaved={async () => {
          setUnifiedModalVisible(false)
          await onSaved()
          await onProjectChanged?.()
          await loadGroup()
        }}
        forceCreate={!hasBudget}
      />
      <ConfirmationModal
        visible={groupConfirmAction === 'reset'}
        header="Reset Project Budget?"
        message="Resets spend counters and reset window for every category. Continue?"
        confirmText="Reset"
        onConfirm={() => runGroupAction('reset')}
        onCancel={() => setGroupConfirmAction(null)}
        limitWidth
      />
      <ConfirmationModal
        visible={groupConfirmAction === 'rebalance'}
        header="Rebalance Project Budget?"
        message="Recalculates member allocations across every category. Continue?"
        confirmText="Rebalance"
        onConfirm={() => runGroupAction('rebalance')}
        onCancel={() => setGroupConfirmAction(null)}
        limitWidth
      />
      <ConfirmationModal
        visible={groupConfirmAction === 'delete'}
        header="Delete Project Budgets?"
        message="All budget categories for this project will be permanently deleted. Continue?"
        confirmText="Delete"
        onConfirm={() => runGroupAction('delete')}
        onCancel={() => setGroupConfirmAction(null)}
        limitWidth
      />
    </>
  )
}

export type ProjectBudgetsAccess = 'full' | 'distribution' | 'view'

interface ProjectBudgetsSectionProps {
  projectName: string
  project?: ProjectDetail | null
  access?: ProjectBudgetsAccess
  onProjectChanged?: () => void | Promise<void>
  spendingRows?: ProjectSpendingWidgetRow[]
  spending?: ProjectSpendingSummary | null
  onBudgetsChanged?: (budgets: ProjectBudget[]) => void
}

const ProjectBudgetsSection: FC<ProjectBudgetsSectionProps> = ({
  projectName,
  project,
  access,
  onProjectChanged,
  spendingRows = [],
  spending,
  onBudgetsChanged,
}) => {
  const canShowBudgetControl = access === 'full' || access === 'distribution'
  const [budgets, setBudgets] = useState<ProjectBudget[]>([])
  const [budgetGroup, setBudgetGroup] = useState<ProjectBudgetGroup | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTableView, setIsTableView] = useState(false)

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
      setBudgetGroup(
        activeGroup ? await projectBudgetsStore.getProjectBudgetGroup(activeGroup.group_id) : null
      )
    } catch {
      // error already handled by store (toaster)
    } finally {
      setLoading(false)
    }
  }, [projectName, onBudgetsChanged])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const budgetCards: BudgetCardData[] = BUDGET_CATEGORIES.map((category) => {
    const scope = budgetGroup?.categories.find((item) => item.category === category)
    const budget = budgets.find((item) => item.budget_category === category)
    const budgetId = scope?.budget_id ?? budget?.budget_id
    const maxBudget = scope?.max_budget ?? budget?.max_budget ?? null
    const spent = spendingRows.find((row) => row.budget_id === budgetId)?.current_spending ?? null
    const unassignedSpend =
      spendingRows.find((row) => row.budget_category === category && !row.is_assigned)
        ?.current_spending ?? null
    return {
      id: budgetId ?? category,
      category,
      maxBudget,
      softBudget: scope?.soft_budget ?? budget?.soft_budget ?? null,
      spent,
      usagePercentage: getSpendPercentage(spent, maxBudget),
      remaining: spent != null && maxBudget != null ? Math.max(maxBudget - spent, 0) : null,
      overrideCount:
        budget?.member_allocations.filter((allocation) => allocation.allocation_mode === 'fixed')
          .length ?? 0,
      memberCount: scope?.member_count ?? budget?.member_count ?? null,
      allocatedMemberBudgetTotal:
        scope?.allocated_member_budget_total ?? budget?.allocated_member_budget_total ?? null,
      unassignedSpend,
    }
  })

  const totalBudget =
    budgetGroup?.total_amount ??
    (budgets.length ? budgets.reduce((total, budget) => total + budget.max_budget, 0) : null)
  const projectSpend = spending?.current_spending ?? null
  const lifetimeSpend = spending?.cumulative_spend ?? null
  const totalBudgetLabel = formatCurrency(totalBudget)
  const resetPeriod = formatResetPeriod(budgetGroup?.budget_duration ?? budgets[0]?.budget_duration)
  const nextReset = spending?.budget_reset_at ?? budgetGroup?.categories[0]?.budget_reset_at
  const nextResetLabel = nextReset ? formatDateTime(nextReset, 'short') : '—'
  const timeUntilReset = spending?.time_until_reset ?? '—'
  const budgetName = budgetGroup?.name || 'Project budget'
  const budgetDescription = budgetGroup?.description || 'No description provided.'

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-base font-semibold text-text-primary">Project budget</div>
          <div className="text-sm text-text-quaternary mt-1">
            Control spending limits for this project.
          </div>
        </div>
        {canShowBudgetControl && (
          <ProjectBudgetManagementControl
            projectName={projectName}
            hasBudget={budgets.length > 0}
            onSaved={loadBudgets}
            project={project}
            access={access ?? 'view'}
            onProjectChanged={onProjectChanged}
          />
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spinner />
        </div>
      ) : (
        <div>
          <div className="mb-5">
            <div className="text-base font-semibold text-text-primary">{budgetName}</div>
            <div className="text-sm text-text-quaternary mt-1">{budgetDescription}</div>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-x-5 gap-y-5 rounded-lg border border-border-structural bg-surface-base-secondary p-4 sm:grid-cols-3">
            <div>
              <div className="text-xs text-text-quaternary">Total budget</div>
              <div className="mt-1 text-base font-semibold text-text-primary">
                {totalBudgetLabel}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-quaternary">Project spend</div>
              <div className="mt-1 text-base font-semibold text-text-primary">
                {formatCurrency(projectSpend)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-quaternary">Lifetime spend</div>
              <div className="mt-1 text-base font-semibold text-text-primary">
                {formatCurrency(lifetimeSpend)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-quaternary">Reset period</div>
              <div className="mt-1 text-base font-semibold text-text-primary">{resetPeriod}</div>
            </div>
            <div>
              <div className="text-xs text-text-quaternary">Next reset</div>
              <div className="mt-1 text-base font-semibold text-text-primary">{nextResetLabel}</div>
            </div>
            <div>
              <div className="text-xs text-text-quaternary">Time until reset</div>
              <div className="mt-1 text-base font-semibold text-text-primary">{timeUntilReset}</div>
            </div>
          </div>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-text-primary">Budget categories</div>
            <button
              type="button"
              className="shrink-0 text-xs text-text-accent-status hover:text-text-accent-status-hover"
              aria-label={isTableView ? 'Switch to card view' : 'Switch to table view'}
              onClick={() => setIsTableView((current) => !current)}
            >
              Change view
            </button>
          </div>
          {isTableView ? (
            <BudgetTableView data={budgetCards} projectName={projectName} />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {budgetCards.map((data) => (
                <BudgetDetailCard key={data.id} data={data} projectName={projectName} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectBudgetsSection
