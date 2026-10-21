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

import { canCloneDataSource, hasCreatableProject } from '../canCloneDataSource'

describe('hasCreatableProject', () => {
  it('is false for a non-admin without projects', () => {
    expect(hasCreatableProject({ isAdmin: false, applications: [] })).toBe(false)
  })

  it('is false when there is no user', () => {
    expect(hasCreatableProject(null)).toBe(false)
  })

  it('is true for an admin', () => {
    expect(hasCreatableProject({ isAdmin: true, applications: [] })).toBe(true)
  })

  it('is true when the user has applications', () => {
    expect(hasCreatableProject({ isAdmin: false, applications: ['proj-a'] })).toBe(true)
  })
})

describe('canCloneDataSource', () => {
  it('is false for bedrock sources', () => {
    expect(canCloneDataSource({ index_type: 'Bedrock_kb' }, { hasCreatableProject: true })).toBe(
      false
    )
  })

  it('is false for platform sources', () => {
    expect(
      canCloneDataSource({ index_type: 'platform_project' }, { hasCreatableProject: true })
    ).toBe(false)
  })

  it('is false when the user has no creatable project', () => {
    expect(canCloneDataSource({ index_type: 'code' }, { hasCreatableProject: false })).toBe(false)
  })

  it('is true for a regular source with a creatable project', () => {
    expect(
      canCloneDataSource({ index_type: 'knowledge_base_jira' }, { hasCreatableProject: true })
    ).toBe(true)
  })
})
