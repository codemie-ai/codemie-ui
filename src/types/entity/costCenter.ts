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

import { ProjectAssignedBudgetSummary } from './project'
import { ProjectListItem } from './projectManagement'

export interface CostCenterAssignedBudgetSummary
  extends Pick<
      ProjectAssignedBudgetSummary,
      | 'budget_category'
      | 'soft_budget'
      | 'max_budget'
      | 'member_count'
      | 'allocated_member_budget_total'
    >,
    SpendQualification {
  budget_duration: string | null
  /** null when the spend port could not produce a figure - never a zero. */
  current_spending: number | null
  /** Rows dropped because their project uses a different reset window than this category's others. */
  excluded_count: number
  /** Rows dropped because the provider-side budget sync hasn't completed (or failed) yet. */
  unsynced_count: number
}

/**
 * `current_spending` can exceed the sum of the categories' spend: it also counts spend in budget
 * categories removed earlier in the current period.
 */
export interface CostCenterBudgetSummary extends SpendQualification {
  current_spending: number | null
  budget_limit: number | null
  total_percent: number | null
  budgets: CostCenterAssignedBudgetSummary[]
}

export interface CostCenterListItem {
  id: string
  name: string
  description?: string | null
  created_by?: string | null
  created_at?: string | null
  project_count: number
}

export interface CostCenterDetail extends CostCenterListItem {
  projects: ProjectListItem[]
}

export interface CostCenterPayload {
  name: string
  description?: string
}

export interface CostCenterUpdatePayload {
  description?: string
}
