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

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import * as useAnnouncementQueueModule from '@/hooks/useAnnouncementQueue'
import { DataSource } from '@/types/entity/dataSource'

import { useDataSourceStatusAnnouncer } from '../useDataSourceStatusAnnouncer'

const createMockDataSource = (overrides: Partial<DataSource> = {}): DataSource => ({
  id: 'test-id-1',
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

describe('useDataSourceStatusAnnouncer', () => {
  let mockAnnounce: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockAnnounce = vi.fn()
    vi.spyOn(useAnnouncementQueueModule, 'useAnnouncementQueue').mockReturnValue({
      announcement: '',
      announce: mockAnnounce,
    })
  })

  it('does not announce anything on the first snapshot', () => {
    const items = [
      createMockDataSource({ id: 'repo-1', repo_name: 'repo-1', is_fetching: true }),
      createMockDataSource({ id: 'repo-2', repo_name: 'repo-2', is_queued: true }),
    ]

    renderHook(() => useDataSourceStatusAnnouncer(items, 'view-1'))

    expect(mockAnnounce).not.toHaveBeenCalled()
  })

  it('announces once when a row transitions from Fetching to Completed', () => {
    const fetchingItem = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      is_fetching: true,
      error: false,
      completed: false,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [fetchingItem],
    })

    // First snapshot only seeds state - no announcement yet
    expect(mockAnnounce).not.toHaveBeenCalled()

    // Re-render with same item - should NOT announce (no change)
    rerender([fetchingItem])
    expect(mockAnnounce).not.toHaveBeenCalled()

    // Now update to Completed
    const completedItem = {
      ...fetchingItem,
      is_fetching: false,
      completed: true,
    }

    rerender([completedItem])

    // Should announce "Completed"
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('Completed'))
  })

  it('does not announce a new row appearing in the first snapshot, but announces it once tracked', () => {
    const item1 = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      is_queued: true,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [item1],
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    // Add a new row after the first snapshot was already seeded
    const item2 = createMockDataSource({
      id: 'repo-2',
      repo_name: 'repo-2',
      is_fetching: true,
    })

    rerender([item1, item2])

    // Should announce the new row once
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenLastCalledWith(expect.stringContaining('repo-2'))
  })

  it('includes percentage when in progress and not provider', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 50,
      complete_state: 100,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('50%'))
  })

  it('does not re-announce when only the in-progress percentage changes', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 10,
      complete_state: 100,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [item],
    })

    // First snapshot is silent
    expect(mockAnnounce).not.toHaveBeenCalled()

    // Poll comes back with progress moved on, title unchanged
    rerender([{ ...item, current_state: 55 }])
    expect(mockAnnounce).not.toHaveBeenCalled()

    // A real title change still announces
    rerender([{ ...item, current_state: 55, completed: true }])
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('Completed'))
  })

  it('does not include percentage when provider in progress', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.PROVIDER,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 50,
      complete_state: 100,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should not include percentage
    expect(mockAnnounce).toHaveBeenCalled()
    const { calls } = mockAnnounce.mock
    expect(calls[0][0]).not.toContain('%')
  })

  it('guards against division by zero in percentage calculation', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 50,
      complete_state: 0, // Zero division case
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should not include NaN or Infinity
    expect(mockAnnounce).toHaveBeenCalled()
    const announcement = mockAnnounce.mock.calls[0][0]
    expect(announcement).not.toContain('NaN')
    expect(announcement).not.toContain('Infinity')
  })

  it('clamps percentage to 100 when current exceeds complete', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 150, // Exceeds complete_state
      complete_state: 100,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should clamp to 100%, not 150%
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('100%'))
  })

  it('announces when a row is removed from the list', () => {
    const item1 = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      is_fetching: true,
    })

    const item2 = createMockDataSource({
      id: 'repo-2',
      repo_name: 'repo-2',
      is_fetching: true,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [item1, item2],
    })

    // First snapshot is silent
    expect(mockAnnounce).not.toHaveBeenCalled()

    // Remove item1 within the same view
    rerender([item2])

    // Should announce removal
    expect(mockAnnounce).toHaveBeenCalled()
    const announcement = mockAnnounce.mock.calls[0][0]
    expect(announcement).toContain('repo-1')
    expect(announcement).toContain('removed')
  })

  it('does not announce removal when the view changes (paging/filtering/sorting)', () => {
    const item1 = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      is_fetching: true,
    })

    const item2 = createMockDataSource({
      id: 'repo-2',
      repo_name: 'repo-2',
      is_fetching: true,
    })

    const { rerender } = renderHook(
      ({ items, viewKey }: { items: (typeof item1)[]; viewKey: string }) =>
        useDataSourceStatusAnnouncer(items, viewKey),
      { initialProps: { items: [item1], viewKey: 'page-1' } }
    )

    mockAnnounce.mockClear()

    // Page 2 shows a different set of rows - repo-1 is not "removed", it's off-page
    rerender({ items: [item2], viewKey: 'page-2' })

    expect(mockAnnounce).not.toHaveBeenCalledWith(expect.stringContaining('removed'))

    mockAnnounce.mockClear()

    // Same view refreshes (poll) with repo-2 gone - now it's a real removal
    rerender({ items: [], viewKey: 'page-2' })

    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('repo-2'))
    expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining('removed'))
  })

  it('handles null repo_name gracefully', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: null as any, // Null case
      is_fetching: true,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, repo_name: null as any, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should not include 'null' or 'undefined'
    expect(mockAnnounce).toHaveBeenCalled()
    const announcement = mockAnnounce.mock.calls[0][0]
    expect(announcement).not.toContain('null')
    expect(announcement).not.toContain('undefined')
    expect(announcement).toBeTruthy()
  })

  it('does not announce whitespace-only messages', () => {
    // When repo_name is whitespace-only, it should be treated as empty
    // and a default name should be used instead
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: '  ', // Whitespace only
      is_fetching: true,
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, repo_name: '  ', is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should announce with fallback name, not whitespace
    expect(mockAnnounce).toHaveBeenCalled()
    const announcement = mockAnnounce.mock.calls[0][0]
    expect(announcement).not.toMatch(/^\s+:/) // Should not start with whitespace and colon
    expect(announcement).toContain('Datasource repo-1') // Should include fallback name
  })

  it('summarizes into a single message when more than 3 simultaneous changes occur', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      createMockDataSource({
        id: `repo-${i}`,
        repo_name: `repo-${i}`,
        is_fetching: true,
      })
    )

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: items,
    })

    // First snapshot is silent
    expect(mockAnnounce).not.toHaveBeenCalled()

    // Now update all of them to the same status
    const updatedItems = items.map((item) => ({
      ...item,
      is_fetching: false,
      completed: true,
    }))

    rerender(updatedItems)

    // Above the threshold of 3, all 10 changes are collapsed into one grouped announcement -
    // nothing is silently dropped, unlike relying on the queue's maxQueueSize cap.
    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith('10 data sources updated: 10 completed')
  })

  it('announces up to 3 simultaneous changes individually (boundary)', () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      createMockDataSource({
        id: `repo-${i}`,
        repo_name: `repo-${i}`,
        is_fetching: true,
      })
    )

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: items,
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    const updatedItems = items.map((item) => ({
      ...item,
      is_fetching: false,
      completed: true,
    }))

    rerender(updatedItems)

    // Exactly at the threshold - still announced one per row, not summarized.
    expect(mockAnnounce).toHaveBeenCalledTimes(3)
    updatedItems.forEach((item) => {
      expect(mockAnnounce).toHaveBeenCalledWith(expect.stringContaining(item.repo_name as string))
    })
  })

  it('groups a summarized announcement by status title, in pipeline order', () => {
    const items = [
      createMockDataSource({ id: 'repo-0', repo_name: 'repo-0', is_queued: true }),
      createMockDataSource({ id: 'repo-1', repo_name: 'repo-1', is_queued: true }),
      createMockDataSource({ id: 'repo-2', repo_name: 'repo-2', is_queued: true }),
      createMockDataSource({ id: 'repo-3', repo_name: 'repo-3', is_queued: true }),
    ]

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: items,
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    // 2 finish, 1 fails, 1 is still fetching - a mixed batch of 4 (> threshold of 3)
    const updated = [
      { ...items[0], is_queued: false, is_fetching: false, completed: true },
      { ...items[1], is_queued: false, is_fetching: false, completed: true },
      { ...items[2], is_queued: false, is_fetching: false, error: true },
      { ...items[3], is_queued: false, is_fetching: true },
    ]

    rerender(updated)

    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    // Pipeline order is Queued, Fetching, Processing, Completed, Error - Fetching appears
    // before Completed and Error in the summary regardless of input order.
    expect(mockAnnounce).toHaveBeenCalledWith(
      '4 data sources updated: 1 fetching, 2 completed, 1 failed'
    )
  })

  it('announces up to 3 removals individually (boundary)', () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      createMockDataSource({ id: `repo-${i}`, repo_name: `repo-${i}`, is_fetching: true })
    )

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: items,
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    rerender([])

    expect(mockAnnounce).toHaveBeenCalledTimes(3)
    items.forEach((item) => {
      expect(mockAnnounce).toHaveBeenCalledWith(`${item.repo_name} removed`)
    })
  })

  it('summarizes into a single message when more than 3 rows are removed at once', () => {
    const items = Array.from({ length: 4 }, (_, i) =>
      createMockDataSource({ id: `repo-${i}`, repo_name: `repo-${i}`, is_fetching: true })
    )

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: items,
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    rerender([])

    expect(mockAnnounce).toHaveBeenCalledTimes(1)
    expect(mockAnnounce).toHaveBeenCalledWith('4 data sources removed')
  })

  it('emits two separate summaries when both status changes and removals overflow in the same poll', () => {
    const changing = Array.from({ length: 4 }, (_, i) =>
      createMockDataSource({ id: `changing-${i}`, repo_name: `changing-${i}`, is_fetching: true })
    )
    const removing = Array.from({ length: 4 }, (_, i) =>
      createMockDataSource({ id: `removing-${i}`, repo_name: `removing-${i}`, is_fetching: true })
    )

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [...changing, ...removing],
    })

    expect(mockAnnounce).not.toHaveBeenCalled()

    const updatedChanging = changing.map((item) => ({
      ...item,
      is_fetching: false,
      completed: true,
    }))

    // removing[] disappears entirely - both buckets are above the threshold of 3
    rerender(updatedChanging)

    expect(mockAnnounce).toHaveBeenCalledTimes(2)
    expect(mockAnnounce).toHaveBeenCalledWith('4 data sources updated: 4 completed')
    expect(mockAnnounce).toHaveBeenCalledWith('4 data sources removed')
  })

  it('does not announce when complete_state is negative', () => {
    const item = createMockDataSource({
      id: 'repo-1',
      repo_name: 'repo-1',
      index_type: INDEX_TYPES.GIT,
      completed: false,
      error: false,
      is_fetching: false,
      is_queued: false,
      current_state: 50,
      complete_state: -100, // Negative complete_state
    })

    const { rerender } = renderHook((items) => useDataSourceStatusAnnouncer(items, 'view-1'), {
      initialProps: [createMockDataSource({ ...item, is_queued: true })],
    })
    mockAnnounce.mockClear()
    rerender([item])

    // Should not include percentage
    expect(mockAnnounce).toHaveBeenCalled()
    const announcement = mockAnnounce.mock.calls[0][0]
    expect(announcement).not.toContain('%')
  })
})
