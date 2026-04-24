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
  current_spending?: number | null
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

/**
 * Derives a budget_id slug from a human-readable name.
 * Rules: lowercase → brackets stripped → spaces become dashes →
 *        non-alphanumeric/dash/underscore removed → collapse dashes → trim edges.
 * Example: "Dev Platform (Q1)" → "dev-platform-q1"
 */
export const generateBudgetId = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')

/** Title-cases a project name: "my-awesome_project" → "My Awesome Project" */
export const prettifyProjectName = (name: string): string =>
  name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Auto-generates a budget name for a project budget.
 * Format: "{Prettified Project} {Category Label}"
 * Guaranteed unique per project+category since the backend enforces one budget per slot.
 * Example: project "my-app" + category "platform" → "My App Platform"
 */
export const generateProjectBudgetName = (projectName: string, category: BudgetCategory): string =>
  `${prettifyProjectName(projectName)} ${getBudgetCategoryLabel(category)}`

/**
 * Auto-generates a budget name for a global budget.
 * Format: "{Category Label} Budget"
 * Example: category "cli" → "CLI Budget"
 */
export const generateGlobalBudgetName = (category: BudgetCategory): string =>
  `${getBudgetCategoryLabel(category)} Budget`
