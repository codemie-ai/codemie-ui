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

import type { AnalyticsQueryParams } from '@/types/analytics'

import { buildCliAnalyticsParams } from '../params'

const BASE: AnalyticsQueryParams = { time_period: 'last_hour' } as AnalyticsQueryParams

describe('buildCliAnalyticsParams', () => {
  it('extracts time_period and leaves dates undefined when not set', () => {
    const result = buildCliAnalyticsParams(BASE)
    expect(result.time_period).toBe('last_hour')
    expect(result.start_date).toBeUndefined()
    expect(result.end_date).toBeUndefined()
  })

  it('passes through start_date and end_date', () => {
    const result = buildCliAnalyticsParams({
      ...BASE,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
    expect(result.start_date).toBe('2026-01-01')
    expect(result.end_date).toBe('2026-01-31')
  })

  it('joins users array as comma-separated string', () => {
    const result = buildCliAnalyticsParams({ ...BASE, users: ['u1', 'u2'] })
    expect(result.users).toBe('u1,u2')
  })

  it('returns undefined users when array is empty', () => {
    const result = buildCliAnalyticsParams({ ...BASE, users: [] })
    expect(result.users).toBeUndefined()
  })

  it('returns undefined users when not set', () => {
    const result = buildCliAnalyticsParams(BASE)
    expect(result.users).toBeUndefined()
  })

  it('joins projects as comma-separated string', () => {
    const result = buildCliAnalyticsParams({ ...BASE, projects: ['p1', 'p2'] })
    expect(result.projects).toBe('p1,p2')
  })

  it('returns undefined projects when array is empty', () => {
    const result = buildCliAnalyticsParams({ ...BASE, projects: [] })
    expect(result.projects).toBeUndefined()
  })

  it('joins repositories argument as comma-separated string', () => {
    const result = buildCliAnalyticsParams(BASE, ['repo-a', 'repo-b'])
    expect(result.repositories).toBe('repo-a,repo-b')
  })

  it('returns undefined repositories when array is empty', () => {
    const result = buildCliAnalyticsParams(BASE, [])
    expect(result.repositories).toBeUndefined()
  })

  it('returns undefined repositories when omitted', () => {
    const result = buildCliAnalyticsParams(BASE)
    expect(result.repositories).toBeUndefined()
  })

  it('passes branch through when provided', () => {
    const result = buildCliAnalyticsParams(BASE, undefined, 'main')
    expect(result.branch).toBe('main')
  })

  it('returns undefined branch when not provided', () => {
    const result = buildCliAnalyticsParams(BASE)
    expect(result.branch).toBeUndefined()
  })
})
