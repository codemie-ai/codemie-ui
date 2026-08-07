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

import {
  getChangedKeys,
  getInitialAssistantFilters,
  checkEmptyFilters,
  createEmptyFilters,
} from '@/utils/filters'

describe('getChangedKeys', () => {
  it('returns an empty array when all values are identical strings', () => {
    const a = { search: 'hello', status: 'active' }
    const b = { search: 'hello', status: 'active' }
    expect(getChangedKeys(a, b)).toEqual([])
  })

  it('returns an empty array when all values are identical arrays', () => {
    const a = { project: ['p1', 'p2'] }
    const b = { project: ['p1', 'p2'] }
    expect(getChangedKeys(a, b)).toEqual([])
  })

  it('returns an empty array for two empty objects', () => {
    expect(getChangedKeys({}, {})).toEqual([])
  })

  it('returns the key when a string value differs between a and b', () => {
    const a = { search: 'old' }
    const b = { search: 'new' }
    expect(getChangedKeys(a, b)).toEqual(['search'])
  })

  it('returns the key when an array value differs between a and b', () => {
    const a = { categories: ['cat1'] }
    const b = { categories: ['cat1', 'cat2'] }
    expect(getChangedKeys(a, b)).toEqual(['categories'])
  })

  it('returns the key when b has a value for a key that a has as empty string', () => {
    const a = { search: '' }
    const b = { search: 'new' }
    expect(getChangedKeys(a, b)).toEqual(['search'])
  })

  it('normalises string values to arrays before comparing (string vs single-element array)', () => {
    // a['search'] = 'hello' normalises to ['hello']
    // b['search'] = ['hello'] stays ['hello']
    // They are equal so no changed keys
    const a: Record<string, string | string[]> = { search: 'hello' }
    const b: Record<string, string | string[]> = { search: ['hello'] }
    expect(getChangedKeys(a, b)).toEqual([])
  })

  it('returns multiple changed keys when several values differ', () => {
    const a = { search: 'old', status: 'inactive', categories: ['cat1'] }
    const b = { search: 'new', status: 'active', categories: ['cat1'] }
    const result = getChangedKeys(a, b)
    expect(result).toContain('search')
    expect(result).toContain('status')
    expect(result).not.toContain('categories')
  })

  it('only iterates over keys present in a, ignoring extra keys in b', () => {
    const a = { search: 'hello' }
    const b = { search: 'hello', extraKey: 'extra' } as Record<string, string | string[]>
    expect(getChangedKeys(a, b)).toEqual([])
  })
})

describe('getInitialAssistantFilters', () => {
  it('returns all values from queryFilterValues when all fields are provided', () => {
    const input = {
      search: 'test',
      project: ['proj1'],
      created_by: 'user1',
      is_global: true,
      shared: true,
      categories: ['cat1', 'cat2'],
    }
    const result = getInitialAssistantFilters(input)
    expect(result).toEqual({
      search: 'test',
      project: ['proj1'],
      created_by: 'user1',
      is_global: true,
      shared: true,
      categories: ['cat1', 'cat2'],
    })
  })

  it('returns all defaults when given an empty object', () => {
    const result = getInitialAssistantFilters({})
    expect(result).toEqual({
      search: '',
      project: [],
      created_by: '',
      is_global: false,
      shared: null,
      categories: [],
    })
  })

  it('uses ?? for is_global so false is preserved rather than replaced with false default', () => {
    const result = getInitialAssistantFilters({ is_global: false })
    expect(result.is_global).toBe(false)
  })

  it('uses ?? for shared so null input yields null (not overridden)', () => {
    const result = getInitialAssistantFilters({ shared: null })
    expect(result.shared).toBeNull()
  })

  it('returns empty string for search when search is an empty string (|| fallback)', () => {
    const result = getInitialAssistantFilters({ search: '' })
    expect(result.search).toBe('')
  })

  it('returns partial defaults when only some fields are provided', () => {
    const result = getInitialAssistantFilters({ search: 'find me', is_global: true })
    expect(result.search).toBe('find me')
    expect(result.project).toEqual([])
    expect(result.created_by).toBe('')
    expect(result.is_global).toBe(true)
    expect(result.shared).toBeNull()
    expect(result.categories).toEqual([])
  })
})

describe('checkEmptyFilters', () => {
  it('returns true when every value is null', () => {
    expect(checkEmptyFilters({ a: null, b: null })).toBe(true)
  })

  it('returns true when every value is undefined', () => {
    expect(checkEmptyFilters({ a: undefined, b: undefined })).toBe(true)
  })

  it('returns true when every value is an empty string', () => {
    expect(checkEmptyFilters({ search: '', created_by: '' })).toBe(true)
  })

  it('returns true when every value is an empty array', () => {
    expect(checkEmptyFilters({ project: [], categories: [] })).toBe(true)
  })

  it('returns true for a mixed object where all values are empty', () => {
    expect(checkEmptyFilters({ a: null, b: '', c: [], d: undefined })).toBe(true)
  })

  it('returns true for an empty object', () => {
    expect(checkEmptyFilters({})).toBe(true)
  })

  it('returns false when at least one value is a non-empty string', () => {
    expect(checkEmptyFilters({ search: 'query', project: [] })).toBe(false)
  })

  it('returns false when at least one value is a non-empty array', () => {
    expect(checkEmptyFilters({ search: '', project: ['proj1'] })).toBe(false)
  })

  it('returns false when at least one value is a non-null non-empty value mixed with empty ones', () => {
    expect(checkEmptyFilters({ a: null, b: '', c: 'not empty', d: [] })).toBe(false)
  })

  it('returns false when a value is the number 0 (not in the empty set)', () => {
    expect(checkEmptyFilters({ count: 0 })).toBe(false)
  })
})

describe('createEmptyFilters', () => {
  it('converts a string field to an empty string', () => {
    const result = createEmptyFilters({ search: 'hello' })
    expect(result).toEqual({ search: '' })
  })

  it('converts an array field to an empty array', () => {
    const result = createEmptyFilters({ project: ['p1', 'p2'] })
    expect(result).toEqual({ project: [] })
  })

  it('converts a number field to null', () => {
    const result = createEmptyFilters({ count: 42 })
    expect(result).toEqual({ count: null })
  })

  it('converts a boolean field to null', () => {
    const result = createEmptyFilters({ is_global: true })
    expect(result).toEqual({ is_global: null })
  })

  it('returns an empty object for an empty input', () => {
    expect(createEmptyFilters({})).toEqual({})
  })

  it('handles a mixed object with string, array, and other types', () => {
    const filters = {
      search: 'query',
      categories: ['cat1'],
      is_global: false,
      count: 5,
    }
    const result = createEmptyFilters(filters)
    expect(result).toEqual({
      search: '',
      categories: [],
      is_global: null,
      count: null,
    })
  })

  it('converts an empty array field to an empty array', () => {
    const result = createEmptyFilters({ tags: [] })
    expect(result).toEqual({ tags: [] })
  })

  it('converts an empty string field to an empty string', () => {
    const result = createEmptyFilters({ search: '' })
    expect(result).toEqual({ search: '' })
  })
})
