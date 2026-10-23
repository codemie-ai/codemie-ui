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

import { needsIntegration } from '../mcpTestRequirements'

const req = (name: string, required = true) => ({ name, description: '', required })

describe('needsIntegration', () => {
  it('returns false when there are no required_env_vars', () => {
    expect(needsIntegration({ required_env_vars: [] })).toBe(false)
  })

  it('returns false when every env var is optional', () => {
    expect(needsIntegration({ required_env_vars: [req('A', false), req('B', false)] })).toBe(false)
  })

  it('returns true when at least one env var is required', () => {
    expect(needsIntegration({ required_env_vars: [req('A', false), req('B', true)] })).toBe(true)
  })
})
