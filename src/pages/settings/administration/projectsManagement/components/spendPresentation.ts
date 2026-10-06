// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { getStatusColor } from '@/pages/analytics/components/widgets/RatioWidget/utils'

/**
 * Shared spend-usage presentation for the Project Details pages (Overview, Budgets, Members):
 * one set of thresholds and one percentage-to-color mapping so a budget at, say, 72% usage
 * reads the same color everywhere it's shown.
 */
export const SPENDING_WARNING_THRESHOLD = 50
export const SPENDING_DANGER_THRESHOLD = 70

/**
 * Local to these pages. `emptyText` defaults to "—" (Overview, Budgets); pass "-" for a cell
 * whose spec/tests expect the shorter hyphen (the Members budget-allocation cell).
 */
export const formatCurrency = (
  value: number | null | undefined,
  emptyText: string = '—'
): string => {
  if (value == null) return emptyText
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const getSpendPercentage = (
  spent: number | null | undefined,
  limit: number | null | undefined
): number | null => {
  if (spent == null || limit == null || limit <= 0) return null
  return (spent / limit) * 100
}

export const getSpendColor = (percentage: number | null | undefined): string | undefined =>
  percentage == null
    ? undefined
    : getStatusColor(percentage, SPENDING_DANGER_THRESHOLD, SPENDING_WARNING_THRESHOLD - 0.0001)

/** Convenience for callers that only have the raw spent/limit pair, not a precomputed percentage. */
export const getSpendColorFromValues = (
  spent: number | null | undefined,
  limit: number | null | undefined
): string | undefined => getSpendColor(getSpendPercentage(spent, limit))
