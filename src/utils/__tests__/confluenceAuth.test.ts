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

import { isConfluenceConnectRequired, parseConfluenceConnectRequired } from '../confluenceAuth'

describe('parseConfluenceConnectRequired', () => {
  it('parses a confluence connect-required payload', () => {
    expect(
      parseConfluenceConnectRequired({
        error: 'confluence_auth_required',
        setting_id: 's1',
        integration_name: 'Team CF',
      })
    ).toEqual({ settingId: 's1', integrationName: 'Team CF' })
  })

  it('defaults the integration name when missing', () => {
    expect(
      parseConfluenceConnectRequired({ error: 'confluence_auth_required', setting_id: 's1' })
    ).toEqual({ settingId: 's1', integrationName: 'Confluence integration' })
  })

  it('returns null for unrelated payloads', () => {
    expect(
      parseConfluenceConnectRequired({ error: 'jira_auth_required', setting_id: 's1' })
    ).toBeNull()
    expect(parseConfluenceConnectRequired(null)).toBeNull()
  })

  it('isConfluenceConnectRequired mirrors the parser', () => {
    expect(
      isConfluenceConnectRequired({ error: 'confluence_auth_required', setting_id: 's1' })
    ).toBe(true)
    expect(isConfluenceConnectRequired({ error: 'other' })).toBe(false)
  })
})
