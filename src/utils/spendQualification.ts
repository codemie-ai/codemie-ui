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

/**
 * Reading the spend annotations, with no runtime dependency of its own.
 *
 * `@/types/entity/userProjectSpending` needs this reader, and a `types/` module that reaches a
 * formatter reaches `@/utils/helpers` -> `@/router` -> every page with it, which puts the router
 * inside a cycle with the very components that describe those rows. Keeping the reader here, with a
 * type-only import, is what lets the types layer stay loadable on its own. Add no value import to
 * this file.
 */

import type { SpendQualification } from '@/types/analytics'

/**
 * The three keys every producer uses to qualify one money figure, in that spelling. Exported for the
 * screens that iterate a raw metrics object and must tell an annotation apart from a metric, instead
 * of rendering `total_spend_unavailable: true` as a figure in its own right.
 */
export const SPEND_QUALIFICATION_FIELDS = [
  'spend_unavailable',
  'spend_partial',
  'spend_missing_amount',
] as const

/**
 * Reads the spend annotations that qualify one money figure. `keyPrefix` selects the
 * `<columnId>_`-prefixed form that rows carrying several money columns use; the default reads the
 * unprefixed, row- or metric-level form.
 */
export const readSpendQualification = (
  source: Record<string, unknown> | null | undefined,
  keyPrefix = ''
): SpendQualification => {
  if (!source) return {}

  const missingAmount = source[`${keyPrefix}spend_missing_amount`]

  return {
    spend_unavailable: source[`${keyPrefix}spend_unavailable`] === true,
    spend_partial: source[`${keyPrefix}spend_partial`] === true,
    spend_missing_amount: typeof missingAmount === 'number' ? missingAmount : null,
  }
}
