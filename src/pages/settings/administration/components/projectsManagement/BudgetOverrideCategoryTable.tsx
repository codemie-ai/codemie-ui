// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, ReactNode } from 'react'

interface BudgetOverrideCategoryTableProps {
  children: ReactNode
  hasActionRow?: boolean
}

/**
 * Shared category editing surface for member budget overrides.
 * Its grid and surface tokens intentionally mirror BudgetCategoryTable used
 * by Update Budget, while the children retain override-specific behavior.
 */
const BudgetOverrideCategoryTable: FC<BudgetOverrideCategoryTableProps> = ({
  children,
  hasActionRow = true,
}) => {
  const gridRowsClass = hasActionRow
    ? 'sm:[grid-template-rows:auto_minmax(2.25rem,auto)_auto_minmax(1.25rem,auto)_auto_minmax(1.25rem,auto)]'
    : 'sm:[grid-template-rows:auto_auto_minmax(1.25rem,auto)_auto_minmax(1.25rem,auto)]'

  return (
    <div
      className={`grid grid-cols-1 content-start gap-4 rounded-lg border border-border-structural bg-surface-base-primary p-3 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-2 ${gridRowsClass}`}
    >
      {children}
    </div>
  )
}

export default BudgetOverrideCategoryTable
