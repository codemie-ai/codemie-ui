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

/** Formats a number as USD with thousands separators and exactly two decimals. */
export const formatCurrency = (value: number): string =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Formats a possibly-absent spend value.
 * `null`/`undefined` mean "no data" and render as `-`; `0` is real spend and renders as `$0.00`.
 */
export const formatSpend = (value: number | null | undefined): string =>
  value == null ? '-' : formatCurrency(value)

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
