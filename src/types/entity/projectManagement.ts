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
import { ChargebackAttribution } from '@/types/entity/project'

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

export interface ProjectListItem {
  name: string
  display_name?: string | null
  description?: string | null
  project_type: string
  created_by?: string | null
  created_at?: string | null
  user_count: number
  admin_count: number
  cost_center_id?: string | null
  cost_center_name?: string | null
  enforce_member_spend_limits?: boolean
  chargeback_enabled?: boolean
  cli_analytics_enabled?: boolean
  chargeback_attribution?: ChargebackAttribution
  budgets?: ProjectAssignedBudgetSummary[] | null
}

export interface ProjectMember {
  user_id: string
  is_project_admin: boolean
  date?: string | null
}

export interface ProjectDetail extends ProjectListItem {
  members: ProjectMember[]
  spending?: ProjectSpendingSummary | null
  spending_widget?: ProjectSpendingWidget | null
  allowed_models?: string[] | null
  default_model?: string | null
}

/**
 * Both money figures are nullable because the backend declares them `Optional[float] = None`: a
 * figure the spend port could not produce is absent, and a consumer must handle that rather than be
 * told by the type that it cannot happen.
 */
export interface ProjectSpendingSummary {
  current_spending: number | null
  budget_reset_at: string | null
  time_until_reset: string | null
  budget_limit: number | null
  total: number | null
}

export interface ProjectSpendingWidgetColumn {
  id: string
  label: string
  type: string
  format: string | null
  description: string
}

/**
 * One budget's row in the project spending widget. Nullable for the same reason as
 * `ProjectSpendingSummary` above.
 */
export interface ProjectSpendingWidgetRow {
  budget_id: string
  budget_category: BudgetCategory | null
  is_assigned: boolean
  current_spending: number | null
  budget_reset_at: string | null
  time_until_reset: string | null
  budget_limit: number | null
  total: number | null
}

export interface ProjectSpendingWidget {
  data: {
    columns: ProjectSpendingWidgetColumn[]
    rows: ProjectSpendingWidgetRow[]
  }
}

export interface ProjectPayload {
  name: string
  display_name?: string | null
  description?: string | null
  cost_center_id?: string | null
  chargeback_enabled?: boolean
}

export interface ProjectUpdatePayload {
  display_name?: string | null
  description?: string | null
  clear_description?: boolean
  cost_center_id?: string | null
  clear_cost_center?: boolean
  enforce_member_spend_limits?: boolean
  chargeback_enabled?: boolean
  chargeback_attribution?: ChargebackAttribution
}
