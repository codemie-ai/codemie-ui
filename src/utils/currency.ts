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

import { ABSENT_VALUE_MARKER } from '@/constants'

const ONE_CENT = 0.01

/**
 * Formats a number as USD with thousands separators and two decimals - except a positive amount
 * below one cent, which keeps two significant digits. Real spend must never read as `$0.00`: an LLM
 * call commonly costs a fraction of a cent, and a reader takes `$0.00` for "nothing spent" - the
 * same failure as rendering an absent figure as zero (EPMCDME-15204). Significant digits rather
 * than `formatCliAnalyticsCost`'s fixed four decimals, so an embedding-sized cost (0.0000026) does
 * not read `$0.0000` either.
 */
export const formatCurrency = (value: number): string =>
  value > 0 && value < ONE_CENT
    ? `$${value.toLocaleString('en-US', { maximumSignificantDigits: 2 })}`
    : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Formats a possibly-absent spend value.
 * `null`/`undefined` mean "no data" and render as `ABSENT_VALUE_MARKER`; `0` is real spend and
 * renders as `$0.00`.
 */
export const formatSpend = (value: number | null | undefined): string =>
  value == null ? ABSENT_VALUE_MARKER : formatCurrency(value)

// Mutually exclusive: pending -> a final cost is coming; unavailable -> none will arrive for
// this record. Either way the amount is not shown (see `formatMoneySpent`). Rendering the wrong
// one promises a human a figure that will never arrive.
const formatMoneySpentSuffix = ({
  pending,
  unavailable,
}: {
  pending?: boolean | null
  unavailable?: boolean | null
}): string => {
  if (pending) return ' (awaiting final cost)'
  if (unavailable) return ' (final cost unavailable)'
  return ''
}

/** Flagged (pending/unavailable) money never shows an amount; an absent amount is not zero. */
export const formatMoneySpent = (
  amount: number | null | undefined,
  flags: { pending?: boolean | null; unavailable?: boolean | null }
): string => {
  const suffix = formatMoneySpentSuffix(flags)
  return amount == null || flags.pending || flags.unavailable
    ? `${ABSENT_VALUE_MARKER}${suffix}`
    : `$${amount.toFixed(4)}`
}

/**
 * Formats an LLM session cost with precision tiers appropriate for AI spend:
 * - Sub-cent values get 4 decimal places to avoid showing real spend as $0.00
 * - Values >= $100 are rounded to integer to reduce noise at large scale
 */
export const formatCliAnalyticsCost = (v: number): string => {
  if (!v) return '$0.00'
  if (v < 0.01) return `$${v.toFixed(4)}`
  if (v < 100) return `$${v.toFixed(2)}`
  return `$${Math.round(v).toLocaleString()}`
}
