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

import { describe, expect, it } from 'vitest'

import { isJiraConnectRequired, parseJiraConnectRequired } from '../jiraAuth'

describe('parseJiraConnectRequired', () => {
  it('parses a jira connect-required payload', () => {
    expect(
      parseJiraConnectRequired({
        error: 'jira_auth_required',
        setting_id: 's1',
        integration_name: 'Team Jira',
      })
    ).toEqual({ settingId: 's1', integrationName: 'Team Jira' })
  })

  it('defaults the integration name when missing', () => {
    expect(parseJiraConnectRequired({ error: 'jira_auth_required', setting_id: 's1' })).toEqual({
      settingId: 's1',
      integrationName: 'Jira integration',
    })
  })

  it('returns null for unrelated payloads', () => {
    expect(parseJiraConnectRequired({ error: 'gitlab_auth_required', setting_id: 's1' })).toBeNull()
    expect(parseJiraConnectRequired({ error: 'jira_auth_required' })).toBeNull()
    expect(parseJiraConnectRequired(null)).toBeNull()
  })

  it('isJiraConnectRequired mirrors the parser', () => {
    expect(isJiraConnectRequired({ error: 'jira_auth_required', setting_id: 's1' })).toBe(true)
    expect(isJiraConnectRequired({ error: 'other' })).toBe(false)
  })
})
