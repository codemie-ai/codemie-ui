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

import { HelpPageId } from '@/constants/helpLinks'
import { OnboardingFlow } from '@/types/onboarding'
import { findOnboardingElement } from '@/utils/onboarding'

export const dataSourceListFlow: OnboardingFlow = {
  id: 'data-source-list',
  name: 'Data Sources List & Indexing',
  description: 'Learn how to monitor indexing status, trigger reindexing, and manage data sources',
  emoji: '📋',
  duration: '2-3 min',
  triggers: { helpPanelPages: [{ id: HelpPageId.DATASOURCES }] },
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Data Sources List',
      description: `Welcome to the Data Sources list tour!

In this guide, you'll learn how to:
- Browse and search your existing data sources
- Track indexing status in real time
- Trigger reindexing when your content changes
- Filter data sources by type, project, and status

Let's explore the data sources list!`,
    },

    // Tech: Navigate to the data sources list page
    {
      id: 'nav-list',
      actionType: 'Navigation',
      route: { name: 'data-sources' },
      delay: 300,
    },

    // Step 2: Data sources table
    {
      id: 'list-table',
      actionType: 'Highlight',
      title: 'Data Sources Table',
      target: () => findOnboardingElement('datasource-list-table'),
      description: `The data sources table shows all data sources you have access to.

Each row displays:
- Name: the data source identifier with a link to its details page
- Project: the project this data source belongs to
- Type: the connector type (Git, Confluence, Jira, etc.)
- Created By / Created / Updated: ownership and timing information
- Shared: whether the data source is shared with all project members
- Status: current indexing state
- Actions: available operations

Click a data source name to open its details page with full indexing history.`,
    },

    // Step 3: Status badge
    {
      id: 'status',
      actionType: 'Highlight',
      title: 'Indexing Status',
      target: () => findOnboardingElement('datasource-status-badge'),
      description: `The status badge shows the current indexing state of each data source:

- Queued: the indexing job is waiting in the queue
- Fetching: content is being retrieved from the source
- Processing: content is being chunked, embedded, and stored (shows a progress bar)
- Completed: indexing finished successfully
- Error: indexing failed; hover the info icon to see the error message

The list auto-refreshes every 5 seconds so you always see the latest state without manually reloading.`,
    },

    // Step 4: Actions menu
    {
      id: 'actions',
      actionType: 'Highlight',
      title: 'Data Source Actions',
      target: () => findOnboardingElement('datasource-actions-menu'),
      description: `Click the actions menu (three dots) on any row to manage that data source:

- View Details: open the full details page with indexing history
- Edit: modify the data source configuration
- Incremental Index: index only new or changed content since the last run
- Full Reindex: reindex all content from scratch
- Resume Indexing: continue a paused indexing job
- Copy ID: copy the data source ID to clipboard
- Export: download the data source configuration as JSON
- Delete: permanently remove the data source

Use Incremental Index for regular updates and Full Reindex only when major changes are made.`,
    },

    // Step 5: Filters
    {
      id: 'filters',
      actionType: 'Highlight',
      title: 'Filter & Search Data Sources',
      target: () => findOnboardingElement('datasource-filters'),
      description: `Use the filter panel to find specific data sources quickly:

- Search by name: type to filter data sources by name
- Type: filter by connector type (Git, Confluence, Jira, etc.)
- Project: filter by one or more projects
- Created by: filter by the user who created the data source
- Status: filter by current indexing status

Applied filters persist between page visits so you return to the same view every time.`,
    },

    // Step 6: Completion
    {
      id: 'completion',
      actionType: 'Modal',
      title: "You're Ready to Manage Data Sources!",
      description: `You've completed the Data Sources list tour.

You now know how to:
✓ Browse all data sources in the table view
✓ Monitor indexing status with real-time updates
✓ Trigger incremental or full reindexing
✓ Filter data sources by type, project, creator, and status

Attach indexed data sources to your assistants to unlock knowledge-driven conversations!`,
      suggestedNextFlows: [
        {
          flowId: 'first-data-source',
          emoji: '📚',
          title: 'Add Your First Data Source',
          description:
            'Walk through creating a new data source and learn all available connector types',
          duration: '6-8 minutes',
        },
        {
          flowId: 'assistants-overview',
          emoji: '🤖',
          title: 'Creating Your First Assistant',
          description: 'Build a custom assistant and attach your indexed data sources to it',
          duration: '4-5 minutes',
        },
      ],
    },
  ],
}
