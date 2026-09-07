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

import { describe, it, expect, vi } from 'vitest'

import { DataSource } from '@/types/entity/dataSource'

import { canFullReindex, canForceReindex } from '../dataSourceUtils'

vi.mock('@/utils/entity', () => ({ canEdit: () => true }))

const buildXWikiDataSource = (overrides: Partial<DataSource> = {}): DataSource =>
  ({
    id: 'ds-1',
    index_type: 'knowledge_base_xwiki',
    project_name: 'test-project',
    repo_name: 'my-xwiki-source',
    completed: true,
    error: false,
    xwiki: { space: 'KB', wiki: 'xwiki' },
    ...overrides,
  } as DataSource)

describe('xWiki reindex capabilities', () => {
  it('allows a full reindex of a completed xWiki datasource', () => {
    expect(canFullReindex(buildXWikiDataSource())).toBe(true)
  })

  it('allows a full reindex of a failed xWiki datasource', () => {
    expect(canFullReindex(buildXWikiDataSource({ completed: false, error: true }))).toBe(true)
  })

  it('allows a force reindex while indexing is still running', () => {
    expect(canForceReindex(buildXWikiDataSource({ completed: false, error: false }))).toBe(true)
  })

  it('does not offer a force reindex once indexing has completed', () => {
    expect(canForceReindex(buildXWikiDataSource({ completed: true }))).toBe(false)
  })
})
