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

import type { AnalyticsQueryParams } from '@/types/analytics'

export interface CliAnalyticsParams {
  time_period: string | undefined
  start_date: string | undefined
  end_date: string | undefined
  users: string | undefined
  projects: string | undefined
  repositories: string | undefined
  branch: string | undefined
}

export function buildCliAnalyticsParams(
  filters: AnalyticsQueryParams,
  repositories?: string[],
  branch?: string
): CliAnalyticsParams {
  return {
    time_period: filters.time_period,
    start_date: filters.start_date,
    end_date: filters.end_date,
    users: filters.users?.length ? filters.users.join(',') : undefined,
    projects: filters.projects?.length ? filters.projects.join(',') : undefined,
    repositories: repositories?.length ? repositories.join(',') : undefined,
    branch: branch || undefined,
  }
}
