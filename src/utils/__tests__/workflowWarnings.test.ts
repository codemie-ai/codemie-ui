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

import { normalizeWarnings, notifyAboutWarnings } from '../workflowWarnings'

vi.mock('@/utils/toaster', () => ({ default: { warning: vi.fn(), error: vi.fn() } }))

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

    expect(toaster.warning).toHaveBeenCalledTimes(1)
    expect(toaster.warning).toHaveBeenCalledWith(
      "Saved. These tools will use each user's own integration: generic_confluence_tool (Confluence); generic_jira_tool (Jira)."
    )
  })

  it('toasts nothing for contract_validation entries mixed into warnings', () => {
    notifyAboutWarnings({
      warnings: [
        { kind: 'contract_validation', outcome: 'ERROR', message: 'bad contract' },
        { kind: 'contract_validation', outcome: 'UNVERIFIED', message: 'unverified contract' },
      ],
    })

    expect(toaster.warning).not.toHaveBeenCalled()
  })

  it('keeps the other toasts and never sends a contract entry to the unknown toast', () => {
    notifyAboutWarnings({
      warnings: [
        { kind: 'consumer_slot', tool_name: 'generic_jira_tool', credential_type: 'Jira' },
        { kind: 'contract_validation', outcome: 'ERROR', message: 'bad contract' },
        { kind: 'something_else', message: 'other message' },
      ],
    })

    expect(toaster.warning).toHaveBeenCalledTimes(2)
    expect(toaster.warning).toHaveBeenCalledWith(
      "These tools will use each user's own integration: generic_jira_tool (Jira)."
    )
    expect(toaster.warning).toHaveBeenCalledWith('other message')
    expect(toaster.warning).not.toHaveBeenCalledWith(expect.stringContaining('bad contract'))
  })

  it.each(['script_step_owner_integration', 'tool_access_owner_integration'])(
    'toasts the %s integration warning',
    (kind) => {
      notifyAboutWarnings({
        warnings: [
          { kind, step_id: 's1', tool_name: 'tool_a', integration_alias: 'a', message: 'm' },
          { kind, step_id: 's2', tool_name: 'tool_b', integration_alias: 'b', message: 'm' },
        ],
      })

      expect(toaster.warning).toHaveBeenCalledTimes(1)
      expect(toaster.warning).toHaveBeenCalledWith(
        "Script steps run these tools under the workflow author's integration for everyone who runs the workflow: tool_a; tool_b.",
        { duration: 8000 }
      )
    }
  )

  it('groups both integration kinds into one toast', () => {
    notifyAboutWarnings(
      {
        warnings: [
          { kind: 'script_step_owner_integration', step_id: 's1', tool_name: 'tool_a' },
          { kind: 'tool_access_owner_integration', step_id: 's2', tool_name: 'tool_b' },
        ],
      },
      { prefixSaved: true }
    )

    expect(toaster.warning).toHaveBeenCalledTimes(1)
    expect(toaster.warning).toHaveBeenCalledWith(
      "Saved. Script steps run these tools under the workflow author's integration for everyone who runs the workflow: tool_a; tool_b.",
      { duration: 8000 }
    )
  })

  it('says nothing when the save carried no warnings', () => {
    notifyAboutWarnings({ warnings: [] })
    notifyAboutWarnings(undefined)

    expect(toaster.warning).not.toHaveBeenCalled()
  })
})

describe('normalizeWarnings', () => {
  it('passes contract entries through untouched', () => {
    const contract = {
      kind: 'contract_validation',
      outcome: 'ERROR',
      tool_name: 'looks_like_slot',
      credential_type: 'Jira',
    }

    expect(normalizeWarnings([contract])).toEqual([contract])
  })
})
