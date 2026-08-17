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
