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

import {
  IntegrationScope,
  parseMemberFormScope,
  parseProjectCapableFormScope,
  parseScopeFilter,
  SCOPE_LABEL,
  scopeFilterParam,
} from '../integrationScope'

describe('parseScopeFilter', () => {
  it.each([
    ['project', true, 'project'],
    ['user', true, 'user'],
    ['all', true, 'all'],
    ['Project', true, 'all'],
    ['x', true, 'all'],
    [undefined, true, 'all'],
    [['project'], true, 'all'],
    ['project', false, 'user'],
    ['user', false, 'user'],
    ['all', false, 'user'],
    ['x', false, 'user'],
    [undefined, false, 'user'],
  ])('parseScopeFilter(%j, %s) -> %s', (raw, canUseProject, expected) => {
    expect(parseScopeFilter(raw, canUseProject)).toBe(expected)
  })
})

describe('parseProjectCapableFormScope', () => {
  it.each([
    ['project', 'project'],
    ['user', 'user'],
    ['Project', 'user'],
    ['all', 'user'],
    [undefined, 'user'],
  ])('parseProjectCapableFormScope(%j) -> %s', (raw, expected) => {
    expect(parseProjectCapableFormScope(raw)).toBe(expected)
  })
})

describe('parseMemberFormScope', () => {
  it('is always user', () => expect(parseMemberFormScope()).toBe('user'))
})

describe('scopeFilterParam', () => {
  it('is undefined for all', () => expect(scopeFilterParam('all')).toBeUndefined())
  it('passes user and project through', () => {
    expect(scopeFilterParam(IntegrationScope.USER)).toBe(IntegrationScope.USER)
    expect(scopeFilterParam(IntegrationScope.PROJECT)).toBe(IntegrationScope.PROJECT)
  })
})

describe('SCOPE_LABEL', () => {
  it('labels both scopes', () => {
    expect(SCOPE_LABEL).toEqual({ user: 'User', project: 'Project' })
  })
})
