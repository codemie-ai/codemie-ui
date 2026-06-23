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

import { BudgetCategory } from '@/types/entity/budget'
import { BudgetSyncStatus } from '@/types/entity/projectBudget'

export interface CategoryBudgetSpec {
  pct: number
  soft_limit_pct?: number | null
  soft_budget?: number | null
}

export interface ProjectBudgetGroupCreatePayload {
  project_name: string
  name: string
  total_amount: number
  budget_duration: string
  description?: string | null
  categories: Record<BudgetCategory, CategoryBudgetSpec>
}

export interface CategoryBudgetSpecUpdate {
  pct: number
  soft_limit_pct?: number | null
  soft_budget?: number | null
}

export interface ProjectBudgetGroupUpdatePayload {
  name?: string | null
  total_amount?: number | null
  budget_duration?: string | null
  description?: string | null
  categories?: Partial<Record<BudgetCategory, CategoryBudgetSpecUpdate>>
}

export interface CategoryBudgetDetail {
  budget_id: string
  category: BudgetCategory
  max_budget: number
  soft_budget: number
  budget_duration: string
  member_count: number
  allocated_member_budget_total: number
  provider_sync_status: BudgetSyncStatus | null
  budget_reset_at?: string | null
  created_at?: string | null
}

export interface ProjectBudgetGroup {
  group_id: string
  project_name: string
  name: string
  budget_duration: string
  total_amount: number
  description?: string | null
  created_by: string
  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
  categories: CategoryBudgetDetail[]
}

export interface ProjectBudgetGroupListResponse {
  items: ProjectBudgetGroup[]
  total: number
}
