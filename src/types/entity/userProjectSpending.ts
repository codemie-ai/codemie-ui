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

import { BudgetCategory } from './budget'

/** Category keys, in display order. Mirrors BUDGET_CATEGORY_ORDER used by BudgetSpendCell. */
export const SPENDING_CATEGORY_KEYS: BudgetCategory[] = ['platform', 'cli', 'premium_models']

/** One row of `user-project-spending`: a user's spend inside one project, per category. */
export interface UserProjectSpendingRow {
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
export interface ProjectMemberSpendingRow {
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
): number | null | undefined => row[`${category}_limit` as keyof typeof row]
