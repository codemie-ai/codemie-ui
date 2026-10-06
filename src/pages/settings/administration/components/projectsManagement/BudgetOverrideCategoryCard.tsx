// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'

import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import { ButtonSize, ButtonType } from '@/constants'
import { BudgetCategory } from '@/types/entity/budget'
import { cn } from '@/utils/utils'

import { normalizeBudgetInput } from './budgetNumber'

export type BudgetOverrideField = 'max' | 'soft'
export type BudgetAllocationState = 'override' | 'project' | 'pending-project' | 'mixed'

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  platform: 'Platform',
  cli: 'CLI',
  premium_models: 'Premium Models',
}

const CATEGORY_DOT_CLASS: Record<BudgetCategory, string> = {
  platform: 'bg-surface-specific-charts-blue',
  cli: 'bg-surface-specific-charts-cyan',
  premium_models: 'bg-surface-specific-charts-purple',
}

interface BudgetOverrideCategoryCardProps {
  category: BudgetCategory
  maxValue: string
  softValue: string
  maxAvailable: number | null
  softAvailable: number | null
  maxError?: string
  softError?: string
  maxDirty?: boolean
  softDirty?: boolean
  maxId: string
  softId: string
  availableLabel?: string
  allocationState?: BudgetAllocationState
  hasActionRow?: boolean
  onMaxChange: (value: string) => void
  onSoftChange: (value: string) => void
  onMaxFocus?: () => void
  onSoftFocus?: () => void
  onRevert?: (field: BudgetOverrideField) => void
  onCategoryAction?: () => void
  resetDisabled?: boolean
}

export const formatBudgetMoney = (value: number | null) =>
  value == null
    ? '—'
    : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const RevertButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    aria-label="Revert"
    title="Revert"
    data-tooltip-id="react-tooltip"
    data-tooltip-content="Revert"
    className="flex h-5 w-5 items-center justify-center text-text-quaternary transition hover:text-text-primary"
    onClick={onClick}
  >
    <RefreshSvg className="h-4 w-4" aria-hidden="true" />
  </button>
)

const BudgetOverrideCategoryCard: FC<BudgetOverrideCategoryCardProps> = ({
  category,
  maxValue,
  softValue,
  maxAvailable,
  softAvailable,
  maxError,
  softError,
  maxDirty = false,
  softDirty = false,
  maxId,
  softId,
  availableLabel = 'Max available',
  allocationState = 'project',
  hasActionRow = true,
  onMaxChange,
  onSoftChange,
  onMaxFocus,
  onSoftFocus,
  onRevert,
  onCategoryAction,
  resetDisabled = false,
}) => {
  const availableText = (value: number | null) => `${availableLabel}: ${formatBudgetMoney(value)}`
  // 'pending-project' still needs the button: it's how the admin undoes an in-progress "use
  // project allocation" click before saving (see MemberAllocationOverrideModal.handleCategoryAction).
  const hasCategoryAction = Boolean(
    onCategoryAction && (allocationState === 'override' || allocationState === 'pending-project')
  )
  const actionLabel = allocationState === 'pending-project' ? 'Undo' : 'Use project allocation'
  let statusText: string | null = null
  if (allocationState === 'override') statusText = 'Override'
  if (allocationState === 'mixed') statusText = 'Mixed'
  const statusType = allocationState === 'override' ? StatusEnum.Warning : StatusEnum.NotStarted
  const cardGridRowsClass = hasActionRow
    ? 'grid-rows-[auto_minmax(2.25rem,auto)_auto_minmax(1.25rem,auto)_auto_minmax(1.25rem,auto)]'
    : 'grid-rows-[auto_auto_minmax(1.25rem,auto)_auto_minmax(1.25rem,auto)]'
  const cardRowSpanClass = hasActionRow ? 'sm:row-span-6' : 'sm:row-span-5'

  return (
    <div className={`min-w-0 ${cardRowSpanClass}`}>
      <div
        className={`grid min-w-0 gap-y-2 sm:grid-rows-[subgrid] sm:gap-y-0 ${cardGridRowsClass}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('h-2 w-2 flex-shrink-0 rounded-full', CATEGORY_DOT_CLASS[category])}
          />
          <h3 className="whitespace-nowrap text-sm text-text-primary">
            {CATEGORY_LABELS[category]}
          </h3>
          {statusText && (
            <StatusBadge
              status={statusType}
              text={statusText}
              className="h-4 shrink-0 px-1.5 text-[10px] normal-case [&>div:first-child]:hidden"
            />
          )}
        </div>
        {hasActionRow && (
          <div className="flex min-h-9 items-start pt-2">
            {hasCategoryAction && (
              <Button
                size={ButtonSize.MEDIUM}
                variant={ButtonType.SECONDARY}
                aria-label={actionLabel}
                title={actionLabel}
                className="shrink-0"
                onClick={onCategoryAction}
                disabled={resetDisabled}
              >
                {actionLabel}
              </Button>
            )}
          </div>
        )}
        <div className={cn('min-w-0', hasActionRow ? 'pt-4' : 'pt-2')}>
          <Input
            id={maxId}
            label="Hard Limit ($)"
            value={maxValue}
            onChange={(event) => onMaxChange(normalizeBudgetInput(event.target.value))}
            onFocus={onMaxFocus}
            type="text"
            inputMode="decimal"
            keyfilter={/[^0-9.,]/g}
            inputClass={maxDirty ? 'pr-8' : undefined}
            error={maxError}
            rightIcon={
              maxDirty && onRevert ? <RevertButton onClick={() => onRevert('max')} /> : undefined
            }
          />
        </div>
        <div className="min-h-5 pt-1 text-xs text-text-quaternary">
          <span className="whitespace-nowrap">{availableText(maxAvailable)}</span>
        </div>
        <div className="min-w-0 pt-4">
          <Input
            id={softId}
            label="Soft Limit ($)"
            value={softValue}
            onChange={(event) => onSoftChange(normalizeBudgetInput(event.target.value))}
            onFocus={onSoftFocus}
            type="text"
            inputMode="decimal"
            keyfilter={/[^0-9.,]/g}
            inputClass={softDirty ? 'pr-8' : undefined}
            error={softError}
            rightIcon={
              softDirty && onRevert ? <RevertButton onClick={() => onRevert('soft')} /> : undefined
            }
          />
        </div>
        <div className="min-h-5 pt-1 text-xs text-text-quaternary">
          <span className="whitespace-nowrap">{availableText(softAvailable)}</span>
        </div>
      </div>
    </div>
  )
}

export default BudgetOverrideCategoryCard
