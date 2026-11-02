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

import { SpendQualification } from '@/types/analytics'
import { readSpendQualification } from '@/utils/spendQualification'

import { BudgetCategory } from './budget'

/** Category keys, in display order. Mirrors BUDGET_CATEGORY_ORDER used by BudgetSpendCell. */
export const SPENDING_CATEGORY_KEYS: BudgetCategory[] = ['platform', 'cli', 'premium_models']

/**
 * The three spend annotations as the backend writes them onto these rows: prefixed with the category
 * column id (`platform_spend_partial`, `cli_spend_unavailable`, ...). One row carries every
 * category's figure, so a single unprefixed triple could not say which figure it qualifies - see
 * `_build_row` in the backend's `service/analytics/handlers/member_spend_service.py`. Mapped rather
 * than spelled out so the nine keys cannot drift from `BudgetCategory` and `SpendQualification`.
 */
type CategorySpendQualifications = {
  [Key in `${BudgetCategory}_${keyof SpendQualification}`]?: boolean | number | null
}

/** One row of `user-project-spending`: a user's spend inside one project, per category. */
export interface UserProjectSpendingRow extends CategorySpendQualifications {
  project_name: string
  display_name?: string | null
  platform?: number | null
  cli?: number | null
  premium_models?: number | null
  platform_limit?: number | null
  cli_limit?: number | null
  premium_models_limit?: number | null
}

/** One row of `project-member-spending`: one member's spend in the current project. */
export interface ProjectMemberSpendingRow extends CategorySpendQualifications {
  user_id: string
  platform?: number | null
  cli?: number | null
  premium_models?: number | null
  platform_limit?: number | null
  cli_limit?: number | null
  premium_models_limit?: number | null
}

/** Reads the spend for a category off a row. */
export const getCategorySpend = (
  row: UserProjectSpendingRow | ProjectMemberSpendingRow,
  category: BudgetCategory
): number | null | undefined => row[category]

/** Reads the limit for a category off a row. `null` means no limit configured. */
export const getCategoryLimit = (
  row: UserProjectSpendingRow | ProjectMemberSpendingRow,
  category: BudgetCategory
): number | null | undefined => row[`${category}_limit`]

/**
 * Reads the annotations qualifying a category's spend on a row, so the figure can be rendered with
 * the doubt it actually carries instead of looking exact.
 */
export const getCategoryQualification = (
  row: CategorySpendQualifications,
  category: BudgetCategory
): SpendQualification => readSpendQualification(row, `${category}_`)
