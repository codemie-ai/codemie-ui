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

import { INDEX_TYPES } from '@/constants/dataSources'
import { DataSource } from '@/types/entity/dataSource'

import { getDataSourceStatusInfo } from '../dataSourceStatus'

const createMockDataSource = (overrides: Partial<DataSource> = {}): DataSource => ({
  id: 'test-id',
  project_name: 'test-project',
  repo_name: 'test-repo',
  index_type: INDEX_TYPES.GIT,
  created_by: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
  project_space_visible: false,
  link: null,
  date: '2026-01-01',
  update_date: '2026-01-01',
  text: 'no error',
  full_name: 'test-repo',
  current_state: 0,
  complete_state: 100,
  current__chunks_state: 0,
  error: false,
  completed: false,
  is_fetching: false,
  is_queued: false,
  user_abilities: [],
  jira: null,
  xray: { jql: '' },
  ...overrides,
})

describe('getDataSourceStatusInfo', () => {
  it('returns title "Queued" when is_queued is true', () => {
    const item = createMockDataSource({
      is_queued: true,
      completed: false,
      error: false,
      is_fetching: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.title).toBe('Queued')
  })

  it('returns title "Fetching" when is_fetching is true', () => {
    const item = createMockDataSource({
      is_fetching: true,
      error: false,
      completed: false,
      is_queued: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.title).toBe('Fetching')
  })

  it('returns title "Processing" when in progress (not fetching, not queued)', () => {
    const item = createMockDataSource({
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.title).toBe('Processing')
  })

  it('returns title "Completed" when completed is true', () => {
    const item = createMockDataSource({
      completed: true,
      error: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.title).toBe('Completed')
  })

  it('returns title "Error" when error is true', () => {
    const item = createMockDataSource({
      error: true,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.title).toBe('Error')
  })

  it('returns correct classes and dotColor for Queued status', () => {
    const item = createMockDataSource({
      is_queued: true,
      completed: false,
      error: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.classes).toBe(
      'bg-not-started-tertiary border-not-started-secondary text-not-started-primary'
    )
    expect(info.dotColor).toBe('bg-not-started-primary')
  })

  it('returns correct classes and dotColor for Fetching status', () => {
    const item = createMockDataSource({
      is_fetching: true,
      error: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.classes).toBe('bg-aborted-tertiary border-aborted-secondary text-aborted-primary')
    expect(info.dotColor).toBe('bg-aborted-primary animate-pulse')
  })

  it('returns correct classes and dotColor for Completed status', () => {
    const item = createMockDataSource({
      completed: true,
      error: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.classes).toBe('bg-success-secondary border-success-primary text-success-primary')
    expect(info.dotColor).toBe('bg-success-primary')
  })

  it('returns correct classes and dotColor for Error status', () => {
    const item = createMockDataSource({
      error: true,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.classes).toBe('bg-failed-tertiary border-failed-secondary text-failed-secondary')
    expect(info.dotColor).toBe('bg-failed-secondary')
  })

  it('sets isProviderInProgress when in progress and index_type is PROVIDER', () => {
    const item = createMockDataSource({
      index_type: INDEX_TYPES.PROVIDER,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.isProviderInProgress).toBe(true)
  })

  it('does not set isProviderInProgress when in progress but index_type is not PROVIDER', () => {
    const item = createMockDataSource({
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
    })

    const info = getDataSourceStatusInfo(item)

    expect(info.isProviderInProgress).toBe(false)
  })

  it('sets isTag true when queued', () => {
    const item = createMockDataSource({ is_queued: true })
    const info = getDataSourceStatusInfo(item)
    expect(info.isTag).toBe(true)
  })

  it('sets isTag true when fetching', () => {
    const item = createMockDataSource({ is_fetching: true, error: false })
    const info = getDataSourceStatusInfo(item)
    expect(info.isTag).toBe(true)
  })

  it('sets isTag true when completed', () => {
    const item = createMockDataSource({ completed: true, error: false })
    const info = getDataSourceStatusInfo(item)
    expect(info.isTag).toBe(true)
  })

  it('sets isTag true when error', () => {
    const item = createMockDataSource({ error: true })
    const info = getDataSourceStatusInfo(item)
    expect(info.isTag).toBe(true)
  })

  it('sets isTag true when provider in progress', () => {
    const item = createMockDataSource({
      index_type: INDEX_TYPES.PROVIDER,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
    })
    const info = getDataSourceStatusInfo(item)
    expect(info.isTag).toBe(true)
  })

  it('sets isInProgress when not completed and not error and not fetching and not queued', () => {
    const item = createMockDataSource({
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
    })
    const info = getDataSourceStatusInfo(item)
    expect(info.isInProgress).toBe(true)
  })

  it('sets isInProgress false when completed', () => {
    const item = createMockDataSource({ completed: true })
    const info = getDataSourceStatusInfo(item)
    expect(info.isInProgress).toBe(false)
  })
})
