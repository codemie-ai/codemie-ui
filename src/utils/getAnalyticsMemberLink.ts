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

import { ANALYTICS } from '@/constants/routes'
import type { useVueRouter } from '@/hooks/useVueRouter'
import { AnalyticsDashboard } from '@/types/analytics'
import type { ProjectBudget } from '@/types/entity/projectBudget'

import { computeAnalyticsBudgetPeriod } from './analyticsBudgetPeriod'

/**
 * Builds the full analytics href for a project member, setting every known
 * filter key explicitly so no stale localStorage value bleeds in.
 *
 * NOTE on userId: pass `UserListItem.id`. Verify this matches the `id` field
 * returned by `GET v1/analytics/users` (what `formatUserOptions` uses as the
 * option value). If they differ, resolve the correct id via
 * `userStore.getAnalyticsUsers` before calling this function.
 */
export function getAnalyticsMemberLink(
  router: ReturnType<typeof useVueRouter>,
  projectName: string,
  userId: string,
  budgets: ProjectBudget[]
): string {
  const period = computeAnalyticsBudgetPeriod(budgets)
  const hasBudgetPeriod = 'start_date' in period

  const query: Record<string, string> = {
    tab: AnalyticsDashboard.insights,
    projects: projectName,
    users: userId,
    start_date: hasBudgetPeriod ? period.start_date : '',
    end_date: hasBudgetPeriod ? period.end_date : '',
    time_period: hasBudgetPeriod ? '' : String(period.time_period),
  }

  const resolved = router.resolve({ name: ANALYTICS, query })
  return resolved.searchParamsString
    ? `${resolved.fullPath}?${resolved.searchParamsString}`
    : resolved.fullPath
}
