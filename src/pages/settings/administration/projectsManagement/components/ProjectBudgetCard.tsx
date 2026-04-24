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

import { FC, useState } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { ButtonSize, ButtonType } from '@/constants'
import { getBudgetCategoryLabel, BudgetCategory } from '@/types/entity/budget'
import { BudgetSyncStatus, ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectSpendingWidgetRow } from '@/types/entity/projectManagement'
import { formatDateTime } from '@/utils/helpers'

import { calculateHardLimitPercentage, getHardLimitSpendColor } from './budgetSpending'

interface ProjectBudgetCardEmptyProps {
  category: BudgetCategory
  onAddBudget?: (category: BudgetCategory) => void
}

interface ProjectBudgetCardAssignedProps {
  budget: ProjectBudget
  spendingRow?: ProjectSpendingWidgetRow | null
  onEdit?: (budget: ProjectBudget) => void
  onReset?: (budget: ProjectBudget) => void
  onDelete?: (budget: ProjectBudget) => void
  onSync?: (budget: ProjectBudget) => void
  onRebalance?: (budget: ProjectBudget) => void
}

type ProjectBudgetCardProps =
  | ({ variant: 'empty'; mode: 'manage' | 'view' } & ProjectBudgetCardEmptyProps)
  | ({ variant: 'assigned'; mode: 'manage' | 'view' } & ProjectBudgetCardAssignedProps)

const NEEDS_SYNC_STATUSES = new Set<BudgetSyncStatus | null | undefined>([
  null,
  undefined,
  'pending',
  'failed',
])

const SYNC_STATUS_CONFIG: Record<
  BudgetSyncStatus,
  { label: string; tooltip: string; className: string }
> = {
  ok: {
    label: 'ok',
    tooltip: 'Budget is active and synced with the provider',
    className: 'text-success-primary',
  },
  noop: {
    label: 'noop',
    tooltip: 'No provider configured — budget limits are tracked locally only',
    className: 'text-text-quaternary',
  },
  pending: {
    label: 'pending',
    tooltip: 'Sync in progress — budget limits are being applied to the provider',
    className: 'text-text-warning',
  },
  failed: {
    label: 'failed',
    tooltip: 'Provider sync failed — budget limits may not be enforced',
    className: 'text-text-error',
  },
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '-'
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const SyncStatusBadge: FC<{ status: BudgetSyncStatus | null | undefined }> = ({ status }) => {
  if (!status) return null
  const config = SYNC_STATUS_CONFIG[status]
  if (!config) return null
  return (
    <span
      className={`text-xs ${config.className}`}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={config.tooltip}
    >
      ●
    </span>
  )
}

const EmptyCard: FC<ProjectBudgetCardEmptyProps & { mode: 'manage' | 'view' }> = ({
  category,
  onAddBudget,
  mode,
}) => (
  <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4 flex flex-col gap-3 min-h-[160px]">
    <div className="text-sm font-medium text-text-primary">{getBudgetCategoryLabel(category)}</div>
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <div className="text-xs text-text-quaternary">— not assigned —</div>
      {mode === 'manage' ? (
        <Button
          size={ButtonSize.SMALL}
          variant={ButtonType.SECONDARY}
          onClick={() => onAddBudget?.(category)}
        >
          <PlusFilledSvg className="w-3 h-3" />
          Add Budget
        </Button>
      ) : null}
    </div>
  </div>
)

const AssignedCard: FC<ProjectBudgetCardAssignedProps & { mode?: 'manage' | 'view' }> = ({
  budget,
  spendingRow,
  onEdit,
  onReset,
  onDelete,
  onSync,
  onRebalance,
  mode = 'manage',
}) => {
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false)
  const [rebalanceConfirmVisible, setRebalanceConfirmVisible] = useState(false)

  const menuItems = [
    {
      title: 'Edit',
      icon: <EditSvg />,
      onClick: () => onEdit?.(budget),
    },
    {
      title: 'Reset',
      icon: <RefreshSvg />,
      onClick: () => setResetConfirmVisible(true),
    },
    {
      title: 'Rebalance',
      icon: <RefreshSvg />,
      onClick: () => setRebalanceConfirmVisible(true),
    },
    {
      title: 'Delete',
      icon: <DeleteSvg />,
      onClick: () => onDelete?.(budget),
    },
  ]

  return (
    <>
      <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-sm font-medium text-text-primary shrink-0">
              {getBudgetCategoryLabel(budget.budget_category)}
            </div>
            {spendingRow != null &&
              (() => {
                const hardLimitPercentage = calculateHardLimitPercentage(
                  spendingRow.current_spending,
                  budget.max_budget
                )
                const color = getHardLimitSpendColor(
                  spendingRow.current_spending,
                  budget.max_budget
                )
                return (
                  <span className="text-sm">
                    <span className="text-text-quaternary">Spend</span>
                    <span className="ml-1" style={color ? { color } : undefined}>
                      {formatCurrency(spendingRow.current_spending)}
                      <span className="ml-1 opacity-75">({hardLimitPercentage.toFixed(1)}%)</span>
                    </span>
                  </span>
                )
              })()}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SyncStatusBadge status={budget.provider_sync_status} />
            {mode === 'manage' && NEEDS_SYNC_STATUSES.has(budget.provider_sync_status) && (
              <button
                type="button"
                className="flex items-center text-text-quaternary hover:text-text-primary transition-colors"
                data-tooltip-id="react-tooltip"
                data-tooltip-content="Sync budget with provider"
                onClick={() => onSync?.(budget)}
              >
                <RefreshSvg className="w-3.5 h-3.5" />
              </button>
            )}
            {mode === 'manage' ? (
              <NavigationMore items={menuItems} hideOnClickInside renderInRoot />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <span className="text-text-quaternary">Hard limit</span>
            <span className="ml-2 text-text-primary">{formatCurrency(budget.max_budget)}</span>
          </div>
          <div>
            <span className="text-text-quaternary">Soft limit</span>
            <span className="ml-2 text-text-primary">{formatCurrency(budget.soft_budget)}</span>
          </div>
          <div>
            <span className="text-text-quaternary">Reset period</span>
            <span className="ml-2 text-text-primary">{budget.budget_duration}</span>
          </div>
          <div>
            {budget.budget_reset_at && (
              <>
                <span className="text-text-quaternary">Resets</span>
                <span className="ml-2 text-text-primary">
                  {formatDateTime(budget.budget_reset_at, 'short')}
                </span>
              </>
            )}
          </div>
          <div className="col-span-2">
            <span className="text-text-quaternary">Members</span>
            <span className="ml-2 text-text-primary">
              {budget.member_count} / {formatCurrency(budget.allocated_member_budget_total)}
            </span>
          </div>
        </div>
      </div>

      {mode === 'manage' ? (
        <>
          <ConfirmationModal
            visible={resetConfirmVisible}
            header="Reset Budget?"
            message={`Reset spend counter for "${budget.name}"? This will re-sync the budget with the provider.`}
            confirmText="Reset"
            confirmButtonType={ButtonType.PRIMARY}
            hideIcon
            onCancel={() => setResetConfirmVisible(false)}
            onConfirm={() => {
              setResetConfirmVisible(false)
              onReset?.(budget)
            }}
          />

          <ConfirmationModal
            visible={rebalanceConfirmVisible}
            header="Rebalance Member Allocations?"
            message="This will recalculate equal splits for all non-fixed members based on the current budget limits."
            confirmText="Rebalance"
            confirmButtonType={ButtonType.PRIMARY}
            hideIcon
            onCancel={() => setRebalanceConfirmVisible(false)}
            onConfirm={() => {
              setRebalanceConfirmVisible(false)
              onRebalance?.(budget)
            }}
            limitWidth
          />
        </>
      ) : null}
    </>
  )
}

const ProjectBudgetCard: FC<ProjectBudgetCardProps> = (props) => {
  if (props.variant === 'empty') {
    return <EmptyCard category={props.category} onAddBudget={props.onAddBudget} mode={props.mode} />
  }
  return (
    <AssignedCard
      budget={props.budget}
      spendingRow={props.spendingRow}
      onEdit={props.onEdit}
      onReset={props.onReset}
      onDelete={props.onDelete}
      onSync={props.onSync}
      onRebalance={props.onRebalance}
      mode={props.mode}
    />
  )
}

export default ProjectBudgetCard
