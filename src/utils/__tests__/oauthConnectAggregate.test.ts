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

import { parseOAuthConnectRequired } from '../oauthConnectAggregate'

describe('parseOAuthConnectRequired', () => {
  it('parses every provider in an aggregate payload', () => {
    const result = parseOAuthConnectRequired({
      error: 'oauth_connect_required',
      providers: [
        { error: 'gitlab_auth_required', setting_id: 'gl-1', integration_name: 'GL' },
        { error: 'jira_auth_required', setting_id: 'ji-1', integration_name: 'JI' },
        { error: 'confluence_auth_required', setting_id: 'cf-1', integration_name: 'CF' },
      ],
    })
    expect(result?.gitlab).toEqual({ settingId: 'gl-1', integrationName: 'GL' })
    expect(result?.jira).toEqual({ settingId: 'ji-1', integrationName: 'JI' })
    expect(result?.confluence).toEqual({ settingId: 'cf-1', integrationName: 'CF' })
  })

  it('parses a partial aggregate (only some providers)', () => {
    const result = parseOAuthConnectRequired({
      error: 'oauth_connect_required',
      providers: [{ error: 'jira_auth_required', setting_id: 'ji-1', integration_name: 'JI' }],
    })
    expect(result?.gitlab).toBeNull()
    expect(result?.jira).toEqual({ settingId: 'ji-1', integrationName: 'JI' })
    expect(result?.confluence).toBeNull()
  })

  it('returns null for a single-provider (non-aggregate) payload', () => {
    expect(
      parseOAuthConnectRequired({ error: 'gitlab_auth_required', setting_id: 'gl-1' })
    ).toBeNull()
  })

  it('returns null for unrelated payloads', () => {
    expect(parseOAuthConnectRequired({ error: 'authentication_required', servers: [] })).toBeNull()
    expect(parseOAuthConnectRequired(null)).toBeNull()
    expect(parseOAuthConnectRequired({ error: 'oauth_connect_required', providers: [] })).toBeNull()
  })
})
