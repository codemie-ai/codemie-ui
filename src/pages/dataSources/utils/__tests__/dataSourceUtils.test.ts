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

import { canFullReindex, canForceReindex, performFullReindex } from '../dataSourceUtils'

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

const buildGitFaqDataSource = (overrides: Partial<DataSource> = {}): DataSource =>
  ({
    id: 'ds-2',
    index_type: 'knowledge_base_git_faq',
    project_name: 'test-project',
    repo_name: 'my-git-faq-source',
    completed: true,
    error: false,
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

  it('still dispatches performFullReindex to updateKBIndex with item.index_type for xWiki (unaffected by the Git FAQ branch)', () => {
    const updateKBIndex = vi.fn()
    const item = buildXWikiDataSource()

    performFullReindex(item, vi.fn(), updateKBIndex, vi.fn(), vi.fn())

    expect(updateKBIndex).toHaveBeenCalledWith(
      item.index_type,
      { name: item.repo_name, project_name: item.project_name },
      true
    )
  })
})

describe('Git FAQ reindex capabilities', () => {
  it('allows a full reindex of a completed Git FAQ datasource', () => {
    expect(canFullReindex(buildGitFaqDataSource())).toBe(true)
  })

  it('allows a full reindex of a Git FAQ datasource whose scheduled run failed', () => {
    expect(canFullReindex(buildGitFaqDataSource({ completed: false, error: true }))).toBe(true)
  })

  it('does not allow a full reindex while a Git FAQ datasource is still indexing', () => {
    expect(canFullReindex(buildGitFaqDataSource({ completed: false, error: false }))).toBe(false)
  })

  it('dispatches performFullReindex to the dedicated reIndexKBIndex route, not updateKBIndex or updateApplicationIndex', () => {
    const reIndexKBIndex = vi.fn()
    const updateKBIndex = vi.fn()
    const updateApplicationIndex = vi.fn()
    const item = buildGitFaqDataSource({ error: true })

    performFullReindex(item, reIndexKBIndex, updateKBIndex, updateApplicationIndex, vi.fn())

    expect(reIndexKBIndex).toHaveBeenCalledWith(item.index_type, item.project_name, item.repo_name)
    expect(updateKBIndex).not.toHaveBeenCalled()
    expect(updateApplicationIndex).not.toHaveBeenCalled()
  })
})
