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

import { useEffect, useMemo, useState } from 'react'

import { useTheme } from '@/hooks/useTheme'
import type { UaCategory, UaError, UaPayer, UaRange } from '@/types/usageAttribution'
import { getTailwindColor } from '@/utils/tailwindColors'

import {
  UA_CATEGORY_COLOR_TOKENS,
  UA_CATEGORY_FALLBACK_COLORS,
  UA_LIKELY_PRODUCTION_OPACITY,
  UA_PAYER_COLOR_TOKENS,
  UA_PAYER_FALLBACK_COLORS,
} from './constants'

const minus = (v: number, shown: number): string => (v < 0 && shown > 0 ? '-' : '')

/** $1,234 (whole dollars; cents under one dollar are shown as $0.xx); -$5 for negative amounts; — when unknown. */
export const formatMoney = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs > 0 && abs < 1) return `${minus(v, abs)}$${abs.toFixed(2)}`
  const rounded = Math.round(abs)
  return `${minus(v, rounded)}$${rounded.toLocaleString('en-US')}`
}

/** $1.2K, $12.3K, $1.4M: for descriptions. Rounded first, so 999,950 reads $1.0M and not $1000.0K. */
export const formatMoneyShort = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  const v = Number(value)
  if (!Number.isFinite(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 999_950) return `${minus(v, abs)}$${(abs / 1e6).toFixed(1)}M`
  if (abs >= 999.5) return `${minus(v, abs)}$${(abs / 1e3).toFixed(1)}K`
  const rounded = Math.round(abs)
  return `${minus(v, rounded)}$${rounded.toLocaleString('en-US')}`
}

export const formatPct = (part: number, whole: number, digits = 0): string => {
  if (!whole) return '0%'
  return `${((part / whole) * 100).toFixed(digits)}%`
}

/** A percentage given as a number of percent: "7.1%", or "<0.1%" for a share too small to show. */
export const formatShare = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—'
  if (value > 0 && value < 0.05) return '<0.1%'
  return `${value.toFixed(1)}%`
}

export const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : Math.round(Number(value)).toLocaleString('en-US')

/** "14:05 UTC" for today, otherwise "Oct 12, 14:05 UTC". */
export const formatUtcTime = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(
    2,
    '0'
  )} UTC`
  const sameDay =
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  if (sameDay) return time
  const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${d.getUTCDate()}, ${time}`
}

export const formatUtcDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * When production days were counted: over the period, or over the longer evidence window (at least the last 30 days)
 * on a shorter period, "since Sep 16, 2026".
 */
export const productionDaysWhen = (
  range: Pick<UaRange, 'from' | 'evidence_from'> | null | undefined
): string =>
  range?.evidence_from && range.from && new Date(range.evidence_from) < new Date(range.from)
    ? `since ${formatUtcDate(range.evidence_from)}`
    : 'in this period'

export const formatSeconds = (ms: number | null | undefined): string =>
  ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} s`

/** Whole seconds since `active` became true, updated every second; 0 while inactive. */
export const useElapsedSeconds = (active: boolean): number => {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    setSeconds(0)
    const started = Date.now()
    const id = active
      ? setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
      : undefined
    return () => {
      if (id) clearInterval(id)
    }
  }, [active])
  return seconds
}

/** The pending text of analysis-backed values: the usual duration first, then the time it has taken so far. */
export const analysingText = (elapsed: number): string =>
  elapsed < 10
    ? 'Analysing repositories… about 10 s'
    : `Analysing repositories… ${elapsed} s so far`

export const errorText = (error: UaError | null): string => {
  if (!error) return ''
  const details = typeof error.details === 'string' ? error.details : ''
  return details ? `${error.message}: ${details}` : error.message
}

/** The wait a Retry-After asks for: "in 42 s", "in 42 min" (rounded up), "in 1 h 5 min"; '' without one. */
export const formatWait = (seconds: number | null | undefined): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return ''
  const s = Math.ceil(seconds)
  if (s < 60) return `in ${s} s`
  const minutes = Math.ceil(s / 60)
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return minutes % 60 ? `in ${hours} h ${minutes % 60} min` : `in ${hours} h`
}

/** The error text, then how long to wait when the API said so (429, or 503/504 with Retry-After). */
export const errorTextWithWait = (error: UaError | null): string => {
  const text = errorText(error)
  const wait = formatWait(error?.retryAfter)
  if (!text || !wait) return text
  return `${text}${/[.!?]$/.test(text) ? '' : '.'} Try again ${wait}.`
}

export interface UaColors {
  category: (cat: UaCategory | 'platform' | 'experiments') => string
  payer: (payer: UaPayer) => string
  likely: () => string
}

// Resolved colours, shared by every badge and chart: one style lookup per token and theme.
const colorCache = new Map<string, string>()

/** Theme-aware colours of categories and payers. Re-resolved when the theme changes. */
export const useUaColors = (): UaColors => {
  const { theme, appearance } = useTheme()
  return useMemo(() => {
    const resolve = (token: string, fallback: string, opacity?: number) => {
      const key = `${theme}|${JSON.stringify(appearance)}|${token}|${opacity ?? ''}`
      if (!colorCache.has(key))
        colorCache.set(key, getTailwindColor(token, fallback, opacity) || fallback)
      return colorCache.get(key) as string
    }
    return {
      category: (cat) => resolve(UA_CATEGORY_COLOR_TOKENS[cat], UA_CATEGORY_FALLBACK_COLORS[cat]),
      payer: (payer) => resolve(UA_PAYER_COLOR_TOKENS[payer], UA_PAYER_FALLBACK_COLORS[payer]),
      likely: () =>
        resolve(
          UA_CATEGORY_COLOR_TOKENS.production,
          UA_CATEGORY_FALLBACK_COLORS.production,
          UA_LIKELY_PRODUCTION_OPACITY
        ),
    }
    // `appearance` covers custom theme presets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, appearance])
}
