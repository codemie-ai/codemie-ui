// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

export const normalizeBudgetInput = (value: string): string => {
  const normalized = value.replace(/\s/g, '').trim()
  if (!normalized) return ''

  if (normalized.includes(',') && normalized.includes('.')) {
    return normalized.replace(/,/g, '')
  }

  if (/^-?\d{1,3}(,\d{3})+$/.test(normalized)) {
    return normalized.replace(/,/g, '')
  }

  return normalized.replace(',', '.')
}

export const parseBudgetNumber = (value: string): number | null => {
  const normalized = normalizeBudgetInput(value)
  if (!normalized || normalized === '.') return null

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export interface BudgetLimitFieldErrors {
  max?: string
  soft?: string
}

export const SOFT_EXCEEDS_HARD_MESSAGE = 'Soft limit cannot exceed hard limit'

/** Shared by the single-member and bulk budget-override modals: both validate a hard/soft pair. */
export const getNonNegativeLimitErrors = (
  max: number | null,
  soft: number | null
): BudgetLimitFieldErrors => ({
  ...(max == null || max < 0 ? { max: 'Hard limit must be a non-negative number' } : {}),
  ...(soft == null || soft < 0 ? { soft: 'Soft limit must be a non-negative number' } : {}),
})
