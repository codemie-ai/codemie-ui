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

import { getLiveAuthConfigIds, isAuthenticatingGateRow } from '@/utils/mcpAuth'

describe('isAuthenticatingGateRow', () => {
  it('returns true when status is authenticating and auth_config_id is present', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: 'a-1' })).toBe(true)
  })

  it('returns false when status is authenticating but auth_config_id is null', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: null })).toBe(false)
  })

  it('returns false when status is authenticating but auth_config_id is undefined', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: undefined })).toBe(
      false
    )
  })

  it('returns false when status is authentication_required with an id', () => {
    expect(
      isAuthenticatingGateRow({ status: 'authentication_required', auth_config_id: 'a-1' })
    ).toBe(false)
  })

  it('returns false when status is authenticated with an id', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticated', auth_config_id: 'a-1' })).toBe(false)
  })
})

describe('getLiveAuthConfigIds', () => {
  it('collects ids in every status, de-duplicated and in first-seen order', () => {
    expect(
      getLiveAuthConfigIds([
        { auth_config_id: 'a-1' },
        { auth_config_id: 'a-2' },
        { auth_config_id: 'a-1' },
      ])
    ).toEqual(['a-1', 'a-2'])
  })

  it('drops rows carrying no usable auth_config_id', () => {
    expect(getLiveAuthConfigIds([{ auth_config_id: '' }, { auth_config_id: null }, {}])).toEqual([])
  })
})
