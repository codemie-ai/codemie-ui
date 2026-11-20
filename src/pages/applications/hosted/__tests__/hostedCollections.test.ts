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

import { describe, expect, it, vi } from 'vitest'

import { hostedApplicationsStore as store } from '@/store/hostedApplications'

import {
  HOSTED_COLLECTIONS,
  HOSTED_FILTER_KEYS,
  HOSTED_FILTERS,
  hostedCatalogParams,
  isHostedCollection,
  loadHostedCollection,
  readHostedCatalogSearch,
} from '../hostedCollections'

describe('hosted catalog collections', () => {
  it.each(['mine', 'project', 'marketplace', 'shared'] as const)(
    '%s loads its own list into the store',
    (id) => {
      const setFilters = vi.spyOn(store, 'setFilters').mockImplementation(() => undefined)
      const load = vi.spyOn(store, 'loadApplications').mockResolvedValue(undefined as never)
      loadHostedCollection(id, {
        query: 'map',
        project: ['alpha'],
        category: [],
        createdBy: 'Jane',
      })
      expect(setFilters).toHaveBeenCalledWith({
        scope: id,
        q: 'map',
        sort: 'updated_desc',
        project: ['alpha'],
        created_by: 'Jane',
      })
      expect(load).toHaveBeenCalledTimes(1)
      vi.restoreAllMocks()
    }
  )

  it('passes the My apps-only filters through', () => {
    const setFilters = vi.spyOn(store, 'setFilters').mockImplementation(() => undefined)
    vi.spyOn(store, 'loadApplications').mockResolvedValue(undefined as never)
    loadHostedCollection('mine', {
      query: '',
      project: [],
      category: [],
      shared: 'people',
      status: 'draft',
    })
    expect(setFilters).toHaveBeenCalledWith({
      scope: 'mine',
      q: '',
      sort: 'updated_desc',
      shared: 'people',
      status: 'draft',
    })
    vi.restoreAllMocks()
  })

  it('declares the URL filters each tab accepts', () => {
    expect(HOSTED_COLLECTIONS.mine.filters).toEqual([
      'project',
      'created_by',
      'category',
      'shared',
      'status',
    ])
    for (const id of ['project', 'marketplace', 'shared'] as const)
      expect(HOSTED_COLLECTIONS[id].filters).toEqual(['project', 'created_by', 'category'])
  })

  it('reads and sends only the filters a tab declares', () => {
    const url = new URLSearchParams(
      'q=map&project=alpha&project=alpha&created_by=Jane&shared=people&status=draft'
    )
    expect(readHostedCatalogSearch(url, 'mine')).toEqual({
      query: 'map',
      project: ['alpha'],
      category: [],
      createdBy: 'Jane',
      shared: 'people',
      status: 'draft',
    })
    expect(readHostedCatalogSearch(url, 'marketplace')).toEqual({
      query: 'map',
      project: ['alpha'],
      category: [],
      createdBy: 'Jane',
    })
    expect(hostedCatalogParams('marketplace', readHostedCatalogSearch(url, 'mine'))).toEqual({
      scope: 'marketplace',
      q: 'map',
      sort: 'updated_desc',
      project: ['alpha'],
      created_by: 'Jane',
    })
  })

  it('ignores values a filter does not know', () => {
    const url = new URLSearchParams('shared=everyone&status=archived')
    expect(readHostedCatalogSearch(url, 'mine')).toEqual({ query: '', project: [], category: [] })
  })

  it.each(['mine', 'project', 'marketplace', 'shared'] as const)(
    '%s reads repeated categories once each and sends them',
    (id) => {
      const url = new URLSearchParams('category=a&category=a&category=b')
      const search = readHostedCatalogSearch(url, id)
      expect(search.category).toEqual(['a', 'b'])
      expect(hostedCatalogParams(id, search).category).toEqual(['a', 'b'])
    }
  )

  it('sends no category while none is picked', () => {
    const search = readHostedCatalogSearch(new URLSearchParams('category='), 'marketplace')
    expect(search.category).toEqual([])
    expect(hostedCatalogParams('marketplace', search)).not.toHaveProperty('category')
  })

  it('drops a category id longer than the filter limit', () => {
    const url = new URLSearchParams({ category: 'x'.repeat(201) })
    url.append('category', 'ok')
    expect(readHostedCatalogSearch(url, 'mine').category).toEqual(['ok'])
  })

  it('writes repeated keys for projects and categories and plain keys for the rest', () => {
    const next = new URLSearchParams()
    HOSTED_FILTERS.category.write(next, [' a ', 'a', '', 'b', 7])
    HOSTED_FILTERS.project.write(next, ['alpha', 'alpha'])
    HOSTED_FILTERS.created_by.write(next, ' Jane ')
    HOSTED_FILTERS.status.write(next, '')
    expect(next.getAll('category')).toEqual(['a', 'b'])
    expect(next.getAll('project')).toEqual(['alpha'])
    expect(next.get('created_by')).toBe('Jane')
    expect(next.has('status')).toBe(false)
  })

  it('lists every filter key', () => {
    expect(HOSTED_FILTER_KEYS).toEqual(['project', 'created_by', 'category', 'shared', 'status'])
  })

  it('offers Create application only from My apps when empty', () => {
    expect(HOSTED_COLLECTIONS.mine.offersCreate).toBe(true)
    expect(HOSTED_COLLECTIONS.marketplace.offersCreate).toBeFalsy()
  })

  it('knows only hosted collections', () => {
    expect(isHostedCollection('shared')).toBe(true)
    expect(isHostedCollection('platform')).toBe(false)
    expect(isHostedCollection('new')).toBe(false)
  })
})
