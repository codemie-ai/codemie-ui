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

export interface ProjectListItem {
  name: string
  description?: string | null
  project_type: string
  created_by?: string | null
  created_at?: string | null
  user_count: number
  admin_count: number
  cost_center_id?: string | null
  cost_center_name?: string | null
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
}

export interface ProjectSpendingSummary {
  current_spending: number
  cumulative_spend?: number | null
  budget_reset_at: string | null
  time_until_reset: string | null
  budget_limit: number | null
  total: number
}

export interface ProjectSpendingWidgetColumn {
  id: string
  label: string
  type: string
  format: string | null
  description: string
}

export interface ProjectSpendingWidgetRow {
  project_name: string
  current_spending: number
  budget_reset_at: string | null
  time_until_reset: string | null
  budget_limit: number | null
  total: number
}

export interface ProjectSpendingWidget {
  data: {
    columns: ProjectSpendingWidgetColumn[]
    rows: ProjectSpendingWidgetRow[]
  }
}

export interface ProjectPayload {
  name: string
  description: string
  cost_center_id?: string | null
}

export interface ProjectUpdatePayload {
  description?: string
  cost_center_id?: string | null
  clear_cost_center?: boolean
}
