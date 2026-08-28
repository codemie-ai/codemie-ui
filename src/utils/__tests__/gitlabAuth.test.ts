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

import { isGitLabConnectRequired, parseGitLabConnectRequired } from '../gitlabAuth'

describe('parseGitLabConnectRequired', () => {
  it('parses a gitlab connect-required payload', () => {
    expect(
      parseGitLabConnectRequired({
        error: 'gitlab_auth_required',
        setting_id: 's1',
        integration_name: 'Team GitLab',
      })
    ).toEqual({ settingId: 's1', integrationName: 'Team GitLab' })
  })

  it('defaults the integration name when missing', () => {
    expect(parseGitLabConnectRequired({ error: 'gitlab_auth_required', setting_id: 's1' })).toEqual(
      { settingId: 's1', integrationName: 'GitLab integration' }
    )
  })

  it('returns null for unrelated payloads', () => {
    expect(parseGitLabConnectRequired({ error: 'authentication_required' })).toBeNull()
    expect(parseGitLabConnectRequired({ error: 'gitlab_auth_required' })).toBeNull() // no setting_id
    expect(parseGitLabConnectRequired(null)).toBeNull()
    expect(parseGitLabConnectRequired('nope')).toBeNull()
  })

  it('isGitLabConnectRequired mirrors the parser', () => {
    expect(isGitLabConnectRequired({ error: 'gitlab_auth_required', setting_id: 's1' })).toBe(true)
    expect(isGitLabConnectRequired({ error: 'other' })).toBe(false)
  })
})
