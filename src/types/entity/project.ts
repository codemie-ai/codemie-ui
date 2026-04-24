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

export interface ProjectCounters {
  assistants_count: number
  workflows_count: number
  integrations_count: number
  datasources_count: number
  skills_count: number
}

export interface ProjectSpendingSummaryCompact {
  current_spending: number
  budget_limit: number | null
  total_percent: number
}

export interface ProjectAssignedBudgetSummary {
  budget_id: string
  name: string
  budget_category: BudgetCategory
  soft_budget: number
  max_budget: number
  budget_duration: string
  budget_reset_at?: string | null
  provider_sync_status?: string | null
  member_count: number
  allocated_member_budget_total: number
  current_spending?: number | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  project_type?: string
  created_by?: string | null
  user_count?: number
  admin_count?: number
  counters?: ProjectCounters
  created_at?: string | null
  cost_center_id?: string | null
  cost_center_name?: string | null
  project_member_budget_tracking_enabled?: boolean
  spending?: ProjectSpendingSummaryCompact | null
  budgets?: ProjectAssignedBudgetSummary[] | null
}

export interface ProjectRequest {
  name?: string
  description?: string
  cost_center_id?: string | null
  clear_cost_center?: boolean
  project_member_budget_tracking_enabled?: boolean
}

export enum ProjectType {
  PERSONAL = 'personal',
  SHARED = 'shared',
}

export enum ProjectRoleBE {
  USER = 'user',
  PLATFORM_ADMIN = 'platform_admin',
  SUPER_ADMIN = 'admin',
}

export enum ProjectRole {
  ADMINISTRATOR = 'administrator',
  USER = 'user',
}

export interface ProjectUserInfo {
  name: string
  isProjectAdmin: boolean
}

export interface ProjectUser {
  userId: string
  name: string
  username: string
  email: string
  isAdmin: boolean
  projects: ProjectUserInfo[]
  picture: string
  user_type?: string | null
}
