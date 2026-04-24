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

export type AllocationMode = 'equal' | 'fixed' | 'weighted'

export type BudgetSyncStatus = 'ok' | 'noop' | 'pending' | 'failed'

export interface ProjectBudgetMemberAllocation {
  user_id: string
  allocation_mode: AllocationMode
  allocated_soft_budget: number
  allocated_max_budget: number
  sync_status: BudgetSyncStatus | null
}

export interface ProjectBudget {
  budget_id: string
  name: string
  description?: string | null
  project_name: string
  budget_category: BudgetCategory
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_reset_at?: string | null
  provider_sync_status: BudgetSyncStatus | null
  member_count: number
  allocated_member_budget_total: number
  member_allocations: ProjectBudgetMemberAllocation[]
  created_at?: string | null
  updated_at?: string | null
}

export interface ProjectBudgetCreatePayload {
  budget_id: string
  name: string
  description?: string | null
  project_name: string
  budget_category: BudgetCategory
  soft_budget: number
  max_budget: number
  budget_duration: string
}

export interface ProjectBudgetUpdatePayload {
  name: string
  description?: string | null
  soft_budget: number
  max_budget: number
  budget_duration: string
}

export interface ProjectBudgetListResponse {
  items: ProjectBudget[]
  total: number
  page: number
  per_page: number
}

export interface MemberAllocationOverridePayload {
  allocated_max_budget: number
  allocated_soft_budget: number
  override_reason?: string | null
}
