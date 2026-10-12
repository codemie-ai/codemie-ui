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

import { describe, it, expect, vi, afterEach } from 'vitest'

import toaster from '@/utils/toaster'

import { notifyAboutWarnings } from '../workflowWarnings'

vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

describe('notifyAboutWarnings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('names the tools that will use each user own integration', () => {
    notifyAboutWarnings(
      {
        warnings: [
          {
            kind: 'consumer_slot',
            tool_name: 'generic_confluence_tool',
            credential_type: 'Confluence',
          },
          { tool_name: 'generic_jira_tool', credential_type: 'Jira' },
        ],
      },
      { prefixSaved: true }
    )

    expect(toaster.info).toHaveBeenCalledTimes(1)
    expect(toaster.info).toHaveBeenCalledWith(
      "Saved. These tools will use each user's own integration: generic_confluence_tool (Confluence); generic_jira_tool (Jira)."
    )
  })

  it('says nothing when the save carried no warnings', () => {
    notifyAboutWarnings({ warnings: [] })
    notifyAboutWarnings(undefined)

    expect(toaster.info).not.toHaveBeenCalled()
  })
})
