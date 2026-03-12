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

import { FC } from 'react'
import { useSnapshot } from 'valtio'

import { analyticsStore } from '@/store/analytics'

import AnalyticsWidget from '../AnalyticsWidget'
import MetricsGrid from './MetricsGrid'

/**
 * Overview widget component
 * Displays high-level overview metrics as cards:
 * - Total Projects
 * - Total Users
 * - Total Assistants
 * - Total Workflows
 * - Total Datasources
 * Data is fetched by the parent AnalyticsDashboard component
 */
const OverviewWidget: FC = () => {
  const { overview, loading, error } = useSnapshot(analyticsStore)

  return (
    <AnalyticsWidget
      title="Overview"
      description="High-level overview of platform usage"
      loading={loading.overview}
      error={error.overview}
    >
      <MetricsGrid data={overview} />
    </AnalyticsWidget>
  )
}

export default OverviewWidget
