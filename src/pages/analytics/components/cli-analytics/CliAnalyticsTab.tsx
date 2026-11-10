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

import { FC, useMemo, useState } from 'react'

import MultiSelect from '@/components/form/MultiSelect'
import { type Tab } from '@/components/Tabs/Tabs'
import { PROJECT_ORIGIN_OPTIONS, SUBSCRIPTION_OPTIONS } from '@/constants/cliAnalytics'
import type { AnalyticsQueryParams } from '@/types/analytics'
import { cn } from '@/utils/utils'

import ActivityView from './views/ActivityView'
import CostView from './views/CostView'
import EfficiencyView from './views/EfficiencyView'
import OverviewView from './views/OverviewView'
import RepositoriesView from './views/RepositoriesView'
import SessionsView from './views/SessionsView'
import ToolsView from './views/ToolsView'
import UsersView from './views/UsersView'

interface CliAnalyticsTabProps {
  filters: AnalyticsQueryParams
}

const CliAnalyticsTab: FC<CliAnalyticsTabProps> = ({ filters: pageFilters }) => {
  const [activeSection, setActiveSection] = useState('overview')
  const [subscriptionTypes, setSubscriptionTypes] = useState<string[]>([])
  const [projectOrigins, setProjectOrigins] = useState<string[]>([])

  // CLI-only filters ride along with the page filters so every view and hook sees one object.
  const filters = useMemo<AnalyticsQueryParams>(
    () => ({
      ...pageFilters,
      subscription_type: subscriptionTypes,
      project_origin: projectOrigins,
    }),
    [pageFilters, subscriptionTypes, projectOrigins]
  )

  const tabs: Tab<string>[] = useMemo(
    () => [
      {
        id: 'overview',
        label: 'Overview',
        element: <OverviewView filters={filters} />,
      },
      {
        id: 'users',
        label: 'Users',
        element: <UsersView filters={filters} />,
      },
      {
        id: 'repositories',
        label: 'Repositories',
        element: <RepositoriesView filters={filters} />,
      },
      {
        id: 'tools',
        label: 'Tools & Models',
        element: <ToolsView filters={filters} />,
      },
      {
        id: 'activity',
        label: 'Activity',
        element: <ActivityView filters={filters} />,
      },
      {
        id: 'efficiency',
        label: 'Efficiency',
        element: <EfficiencyView filters={filters} />,
      },
      {
        id: 'cost',
        label: 'Cost',
        element: <CostView filters={filters} />,
      },
      {
        id: 'sessions',
        label: 'Sessions',
        element: <SessionsView filters={filters} />,
      },
    ],
    [filters]
  )

  const activeTabContent = tabs.find((tab) => tab.id === activeSection)?.element

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <MultiSelect
          id="cli-analytics-subscription"
          label="Subscription"
          hideLabel
          value={subscriptionTypes}
          options={SUBSCRIPTION_OPTIONS}
          onChange={(e) => setSubscriptionTypes(e.value ?? [])}
          placeholder="All subscriptions"
          className="w-56"
        />
        <MultiSelect
          id="cli-analytics-project-origin"
          label="Project origin"
          hideLabel
          value={projectOrigins}
          options={PROJECT_ORIGIN_OPTIONS}
          onChange={(e) => setProjectOrigins(e.value ?? [])}
          placeholder="All project origins"
          className="w-64"
        />
      </div>
      <div className="flex flex-wrap overflow-hidden rounded-lg border border-border-structural w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeSection === tab.id
                ? 'bg-surface-interactive-active text-text-primary'
                : 'bg-surface-base-secondary text-text-secondary hover:bg-surface-base-tertiary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div key={activeSection} role="tabpanel">
        {activeTabContent}
      </div>
    </div>
  )
}

export default CliAnalyticsTab
