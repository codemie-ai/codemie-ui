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

export type BudgetCategory = 'platform' | 'cli' | 'premium_models'

export interface Budget {
  budget_id: string
  name: string
  description?: string | null
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_category: BudgetCategory
  budget_reset_at?: string | null
  is_preconfigured?: boolean
  created_by?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface BudgetPayload {
  budget_id?: string
  name: string
  description?: string | null
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_category: BudgetCategory
}

export interface BudgetAssignment {
  category: BudgetCategory
  budget_id: string | null
  budget_name?: string | null
  max_budget?: number | null
  budget_duration?: string | null
  budget_reset_at?: string | null
}

export interface BudgetAssignmentsPayload {
  assignments: BudgetAssignment[]
}

export interface BudgetListResponse {
  data: Budget[]
  pagination: {
    total: number
    page: number
    per_page: number
  }
}

export interface BudgetSyncResult {
  created: number
  updated: number
  unchanged: number
  total_in_litellm: number
  budgets: Budget[]
}

export const BUDGET_CATEGORY_OPTIONS: Array<{ label: string; value: BudgetCategory }> = [
  { label: 'Platform', value: 'platform' },
  { label: 'CLI', value: 'cli' },
  { label: 'Premium models', value: 'premium_models' },
]

export const getBudgetCategoryLabel = (category: BudgetCategory): string =>
  BUDGET_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
