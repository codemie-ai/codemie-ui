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

import { AnalyticsQueryParams, TimePeriod } from '@/types/analytics'

export const DEFAULT_FILTERS: AnalyticsQueryParams = {
  time_period: TimePeriod.LAST_HOUR,
}

export const TIME_PERIOD_OPTIONS = [
  { label: 'Last Hour', value: TimePeriod.LAST_HOUR },
  { label: 'Last 6 Hours', value: TimePeriod.LAST_6_HOURS },
  { label: 'Last 24 Hours', value: TimePeriod.LAST_24_HOURS },
  { label: 'Last 7 Days', value: TimePeriod.LAST_7_DAYS },
  { label: 'Last 30 Days', value: TimePeriod.LAST_30_DAYS },
  { label: 'Last 60 Days', value: TimePeriod.LAST_60_DAYS },
  { label: 'Last Year', value: TimePeriod.LAST_YEAR },
]

export const ANALYTICS_DASHBOARDS_KEY = 'analytics-dashboard-list-key'

export const MAX_DASHBOARDS_LIMIT = 5
export const DASHBOARD_LIMIT_MSG = `Dashboard limit reached (${MAX_DASHBOARDS_LIMIT}). Delete a dashboard to create a new one.`
