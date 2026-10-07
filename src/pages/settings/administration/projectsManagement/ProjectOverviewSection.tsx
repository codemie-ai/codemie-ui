// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import Hint from '@/components/Hint'
import Popup from '@/components/Popup'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { ANALYTICS } from '@/constants/routes'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import SpendingProgressBar from '@/pages/analytics/components/widgets/SpendingProgressBar'
import { analyticsStore } from '@/store/analytics'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { Metric, OverviewMetricType } from '@/types/analytics'
import {
  BUDGET_CATEGORY_OPTIONS,
  BudgetCategory,
  getBudgetCategoryLabel,
} from '@/types/entity/budget'
import { BudgetSyncStatus, ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectDetail, ProjectSpendingWidgetRow } from '@/types/entity/projectManagement'
import { computeAnalyticsBudgetPeriod } from '@/utils/analyticsBudgetPeriod'
import { formatDateTime, pluralize } from '@/utils/helpers'
import { displayValue } from '@/utils/utils'

import ProjectOverviewIndicators from './components/ProjectOverviewIndicators'
import {
  formatCurrency,
  getSpendColor,
  getSpendPercentage,
  SPENDING_DANGER_THRESHOLD,
  SPENDING_WARNING_THRESHOLD,
} from './components/spendPresentation'
import { ProjectBudgetManagementControl, ProjectBudgetsAccess } from './ProjectBudgetsSection'

const describeOverrideCount = (count: number): string => {
  if (count <= 0) return 'No user overrides'
  return count === 1 ? '1 user override' : `${count} user overrides`
}

const getBudgetSyncStatusPresentation = (status: BudgetSyncStatus | null) => {
  if (status === 'ok' || status === 'noop') {
    return { colorClass: 'bg-success-primary', label: 'Synchronization successful' }
  }
  if (status === 'failed') {
    return { colorClass: 'bg-failed-secondary', label: 'Synchronization failed' }
  }
  return { colorClass: 'bg-border-subtle', label: 'Not synchronized yet' }
}

const BudgetSyncStatusDot: FC<{ status: BudgetSyncStatus | null }> = ({ status }) => {
  const { colorClass, label } = getBudgetSyncStatusPresentation(status)

  return (
    <button
      type="button"
      className="flex size-3 shrink-0 items-center justify-center rounded-full"
      aria-label={label}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={label}
      data-tooltip-place="top"
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${colorClass}`} />
    </button>
  )
}

const InfoItem: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <div className="mb-1 text-xs text-text-quaternary">{label}</div>
    <div className="break-words text-sm leading-5 text-text-primary">{value}</div>
  </div>
)

const DESCRIPTION_PREVIEW_LIMIT = 240

const DescriptionPreview: FC<{ description: string; onViewFull: () => void }> = ({
  description,
  onViewFull,
}) => {
  if (!description) return <span className="text-text-quaternary">No description</span>

  const isLong = description.length > DESCRIPTION_PREVIEW_LIMIT
  return (
    <div className="min-w-0">
      <div className={isLong ? 'line-clamp-3' : 'whitespace-pre-wrap'}>{description}</div>
      {isLong && (
        <button
          type="button"
          className="mt-2 text-xs text-text-accent-status hover:text-text-accent-status-hover"
          onClick={onViewFull}
        >
          View full description
        </button>
      )}
    </div>
  )
}

interface BudgetSummaryCardProps {
  category: BudgetCategory
  budget?: ProjectBudget
  spendingRow?: ProjectSpendingWidgetRow
}

const BudgetSummaryCard: FC<BudgetSummaryCardProps> = ({ category, budget, spendingRow }) => {
  if (!budget) {
    return (
      <div className="flex min-h-40 min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            {getBudgetCategoryLabel(category)}
            <StatusBadge status={StatusEnum.NotStarted} text="Disabled" />
          </div>
          <BudgetSyncStatusDot status={null} />
        </div>
        {spendingRow != null ? (
          <div className="flex flex-1 flex-col gap-2 text-xs">
            <div>
              <span className="text-text-quaternary">Spend</span>
              <span className="ml-2 text-text-primary">
                {formatCurrency(spendingRow.current_spending)}
              </span>
            </div>

            <div>
              <span className="text-text-quaternary">Budget</span>
              <span className="ml-2 text-text-primary">
                not assigned
                <Hint
                  id={`budget-summary-card-not-assigned-${category}`}
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

  const percentage = getSpendPercentage(spendingRow?.current_spending, budget.max_budget)
  const spendColor = getSpendColor(percentage)
  const overrideCount = budget.member_allocations.filter(
    (allocation) => allocation.allocation_mode === 'fixed'
  ).length
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-medium text-text-primary">
          {getBudgetCategoryLabel(budget.budget_category)}
        </div>
        <BudgetSyncStatusDot status={budget.provider_sync_status} />
      </div>

      <div className="min-w-0">
        <div className="text-xs text-text-quaternary">Spend / hard limit</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className="text-base font-semibold"
            style={spendColor ? { color: spendColor } : undefined}
          >
            {formatCurrency(spendingRow?.current_spending)}
          </span>
          <span className="text-base font-normal text-text-primary">
            / {formatCurrency(budget.max_budget)}
          </span>
        </div>
        <SpendingProgressBar
          percentage={percentage ?? 0}
          dangerThreshold={SPENDING_DANGER_THRESHOLD}
          warningThreshold={SPENDING_WARNING_THRESHOLD - 0.0001}
          className="mt-2 !gap-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <InfoItem label="Soft limit" value={formatCurrency(budget.soft_budget)} />
      </div>
      <div className="mt-auto min-h-4 text-xs text-text-quaternary">
        {describeOverrideCount(overrideCount)}
      </div>
    </div>
  )
}

interface Props {
  project: ProjectDetail
  onCostCenterOpen: () => void
  budgetsAccess: ProjectBudgetsAccess
  isChargebackFeatureEnabled?: boolean
  costCentersEnabled?: boolean
  canViewBudgets: boolean
  canManageProject: boolean
  isModelsConfigEnabled?: boolean
  spendingRows?: ProjectSpendingWidgetRow[]
  /** Reload the project after a budget save — chargeback settings live on the project. */
  onProjectChanged?: () => void | Promise<void>
}

const getChargebackStatus = (
  enabled: boolean | undefined,
  attribution: ProjectDetail['chargeback_attribution'],
  costCentersEnabled: boolean | undefined
) => {
  if (!enabled) return 'Disabled'
  if (costCentersEnabled && attribution === 'cost_center') {
    return 'Enabled, attributed to a cost center'
  }
  return 'Enabled'
}

interface RoutingImpact {
  requests: number
  savings: number
}

const getRoutingMetric = (metrics: Metric[], id: string) =>
  Number(metrics.find((item) => item.id === id)?.value ?? 0)

const getRoutingImpactText = (routing: RoutingImpact | null | undefined): string => {
  if (routing === undefined) return 'Loading…'
  if (routing === null) return 'Not available'
  return `${formatCurrency(routing.savings)} (${routing.requests.toLocaleString()} ${pluralize(
    routing.requests,
    'request'
  )})`
}

const ProjectOverviewSection: FC<Props> = ({
  project,
  onCostCenterOpen,
  budgetsAccess,
  isChargebackFeatureEnabled,
  costCentersEnabled,
  canViewBudgets,
  canManageProject,
  isModelsConfigEnabled = false,
  spendingRows = [],
  onProjectChanged,
}) => {
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAGS.COST_CENTERS)
  const [isRoutingAnalyticsEnabled] = useFeatureFlag(FEATURE_FLAGS.ROUTING_ANALYTICS)
  const [projectBudgets, setProjectBudgets] = useState<ProjectBudget[]>([])
  const [budgetLoadError, setBudgetLoadError] = useState(false)
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
  const [routing, setRouting] = useState<RoutingImpact | null | undefined>()
  const router = useVueRouter()
  const description = project.description?.trim() ?? ''
  const spending = canViewBudgets ? project.spending : undefined
  const costCenterName = project.cost_center_name || '—'
  const createdBy = project.created_by?.trim() || '—'

  const loadProjectBudgets = useCallback(() => {
    if (!canViewBudgets) {
      setProjectBudgets([])
      setBudgetLoadError(false)
      return Promise.resolve()
    }
    setProjectBudgets([])
    setBudgetLoadError(false)
    return projectBudgetsStore
      .listProjectBudgets({ projectName: project.name })
      .then(setProjectBudgets)
      .catch((error) => {
        console.error('Failed to load project budgets', error)
        setProjectBudgets([])
        setBudgetLoadError(true)
      })
  }, [canViewBudgets, project.name])

  useEffect(() => {
    loadProjectBudgets()
  }, [loadProjectBudgets])

  useEffect(() => {
    let cancelled = false

    if (!isRoutingAnalyticsEnabled) {
      setRouting(null)
      return () => {
        cancelled = true
      }
    }

    const period = computeAnalyticsBudgetPeriod(projectBudgets)
    analyticsStore
      .fetchSummaries(OverviewMetricType.ROUTING_SUMMARY, {
        projects: [project.name],
        ...period,
      })
      .then((response) => {
        if (!response) return null
        return {
          requests: getRoutingMetric(response.data.metrics, 'request_count'),
          savings: getRoutingMetric(response.data.metrics, 'total_potential_savings'),
        }
      })
      .catch(() => null)
      .then((value) => {
        if (!cancelled) setRouting(value)
      })

    return () => {
      cancelled = true
    }
  }, [isRoutingAnalyticsEnabled, project.name, projectBudgets])

  const budgetByCategory = useMemo(
    () => new Map(projectBudgets.map((budget) => [budget.budget_category, budget])),
    [projectBudgets]
  )
  const totalBudget = useMemo(
    () =>
      projectBudgets.length
        ? projectBudgets.reduce((total, budget) => total + budget.max_budget, 0)
        : null,
    [projectBudgets]
  )

  const openAnalytics = () => {
    const period = computeAnalyticsBudgetPeriod(projectBudgets)
    const hasBudgetPeriod = 'start_date' in period

    router.push({
      name: ANALYTICS,
      query: {
        projects: [project.name],
        ...(hasBudgetPeriod
          ? { start_date: period.start_date, end_date: period.end_date }
          : { time_period: period.time_period }),
      },
    })
  }

  return (
    <>
      <div className="flex flex-col gap-6 pt-5 pb-8">
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
          <section className="flex min-h-0 flex-col">
            <div className="mb-3 text-sm font-semibold text-text-primary">Project information</div>
            <div className="min-h-0 flex-1 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
              <div className="mb-5">
                <div className="mb-1 text-xs text-text-quaternary">Description</div>
                <div className="text-sm leading-5 text-text-primary">
                  <DescriptionPreview
                    description={description}
                    onViewFull={() => setIsDescriptionOpen(true)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)]">
                <InfoItem
                  label="Type"
                  value={<span className="capitalize">{project.project_type}</span>}
                />
                <InfoItem
                  label="Created by"
                  value={
                    <span className="block whitespace-nowrap" title={createdBy}>
                      {displayValue(createdBy)}
                    </span>
                  }
                />
                <InfoItem label="Users" value={project.user_count} />
                <InfoItem
                  label="Created at"
                  value={
                    <span className="whitespace-nowrap">{formatDateTime(project.created_at)}</span>
                  }
                />
                <InfoItem label="Admins" value={project.admin_count} />
                {isCostCentersEnabled && (
                  <InfoItem
                    label="Cost center"
                    value={
                      project.cost_center_id && project.cost_center_name ? (
                        <button
                          type="button"
                          className="whitespace-nowrap text-left text-text-accent-status hover:text-text-accent-status-hover"
                          onClick={onCostCenterOpen}
                          title={costCenterName}
                        >
                          {costCenterName}
                        </button>
                      ) : (
                        <span className="whitespace-nowrap">{costCenterName}</span>
                      )
                    }
                  />
                )}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-text-primary">Financial summary</div>
              <button
                type="button"
                className="shrink-0 text-xs text-text-accent-status hover:text-text-accent-status-hover"
                onClick={openAnalytics}
              >
                View analytics
              </button>
            </div>
            <div className="min-h-0 flex-1 rounded-lg border border-border-structural bg-surface-base-secondary p-4">
              <div className="mb-5">
                <InfoItem label="Total budget" value={formatCurrency(totalBudget ?? null)} />
              </div>
              <div className="grid grid-cols-2 content-start gap-x-5 gap-y-5">
                <InfoItem
                  label="Budget period spend"
                  value={formatCurrency(spending?.current_spending)}
                />
                <InfoItem
                  label="Lifetime spend"
                  value={formatCurrency(spending?.cumulative_spend)}
                />
                <InfoItem
                  label="Budget reset"
                  value={
                    spending?.budget_reset_at
                      ? formatDateTime(spending.budget_reset_at, 'short')
                      : '—'
                  }
                />
                <InfoItem label="Time until reset" value={spending?.time_until_reset ?? '—'} />
                <InfoItem label="Reset period" value={projectBudgets[0]?.budget_duration || '—'} />
                <InfoItem
                  label="Member spend limits"
                  value={project.enforce_member_spend_limits ? 'Enabled' : 'Disabled'}
                />
                {isChargebackFeatureEnabled && (
                  <InfoItem
                    label="Chargeback"
                    value={getChargebackStatus(
                      project.chargeback_enabled,
                      project.chargeback_attribution,
                      costCentersEnabled
                    )}
                  />
                )}
                {isRoutingAnalyticsEnabled && (
                  <InfoItem label="Routing impact" value={getRoutingImpactText(routing)} />
                )}
              </div>
            </div>
          </section>
        </div>

        <ProjectOverviewIndicators
          projectName={project.name}
          canManageProject={canManageProject}
          isModelsConfigEnabled={isModelsConfigEnabled}
        />

        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-3">
              <div className="text-sm font-semibold text-text-primary">Active budgets</div>
            </div>
            {(budgetsAccess === 'full' || budgetsAccess === 'distribution') && (
              <ProjectBudgetManagementControl
                projectName={project.name}
                hasBudget={projectBudgets.length > 0}
                onSaved={loadProjectBudgets}
                project={project}
                access={budgetsAccess}
                onProjectChanged={onProjectChanged}
              />
            )}
          </div>
          {budgetLoadError && (
            <p className="mb-3 text-xs text-text-error" role="alert">
              Unable to load active budgets.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {BUDGET_CATEGORY_OPTIONS.map(({ value }) => (
              <BudgetSummaryCard
                key={value}
                category={value}
                budget={budgetByCategory.get(value)}
                spendingRow={spendingRows.find(
                  (row) => row.budget_id === budgetByCategory.get(value)?.budget_id
                )}
              />
            ))}
          </div>
        </section>
      </div>

      <Popup
        visible={isDescriptionOpen}
        onHide={() => setIsDescriptionOpen(false)}
        header="Project description"
        hideFooter
        className="w-full max-w-2xl"
        bodyClassName="pb-6"
        withBorderBottom={false}
      >
        <div className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words text-sm text-text-primary">
          {description || 'No description'}
        </div>
      </Popup>
    </>
  )
}

export default ProjectOverviewSection
