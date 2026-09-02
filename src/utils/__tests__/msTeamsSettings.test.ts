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

import { buildMsTeamsCredentialValues, readAssistantIdsFromSetting } from '../msTeamsSettings'

describe('msTeamsSettings', () => {
  it('round-trips an array of assistant ids through credential_values', () => {
    const values = buildMsTeamsCredentialValues(['a1', 'a2'])
    expect(values).toEqual([{ key: 'assistant_ids', value: ['a1', 'a2'] }])
    expect(readAssistantIdsFromSetting({ credential_values: values })).toEqual(['a1', 'a2'])
  })

  it('returns an empty array when assistant_ids is missing', () => {
    expect(readAssistantIdsFromSetting({ credential_values: [] })).toEqual([])
  })
})
