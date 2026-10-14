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

import { describe, it, expect } from 'vitest'

import { cliAnalyticsStore } from '../cliAnalytics'

describe('cliAnalyticsStore.clearRepositories', () => {
  it('resets the repositories slot to null', () => {
    cliAnalyticsStore.repositories = {
      rows: [
        {
          repository: 'stale-repo',
          session_count: 1,
          turns: 1,
          cost_usd: 1,
          files_changed: 1,
          lines_added: 1,
          lines_removed: 0,
          net_lines: 1,
          tool_success_rate: 100,
        },
      ],
      pagination: { page: 0, per_page: 10, total_count: 1, has_more: false },
    }

    cliAnalyticsStore.clearRepositories()

    expect(cliAnalyticsStore.repositories).toBeNull()
  })
})
