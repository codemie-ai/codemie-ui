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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

import { createProjectActivityEventsStore } from '../projectActivityEvents'

vi.mock('@/utils/api')

describe('createProjectActivityEventsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an independent store instance on every call', () => {
    const a = createProjectActivityEventsStore()
    const b = createProjectActivityEventsStore()
    a.loading = true
    expect(b.loading).toBe(false)
    expect(a).not.toBe(b)
  })

  it('listEvents populates events, mapped pagination, and clears error on success', async () => {
    const response = {
      data: [
        {
          id: '1',
          domain: 'budget',
          event_type: 'x',
          label: 'X',
          category: 'Budget',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
      recording_enabled: true,
    }
    ;(api.get as any).mockResolvedValue({ json: async () => response })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1')
    expect(store.events).toEqual(response.data)
    expect(store.pagination).toEqual({ page: 0, perPage: 50, totalCount: 1, totalPages: 1 })
    expect(store.error).toBeNull()
  })

  it('listEvents sets error (not a thrown toast) on failure, leaving loading false', async () => {
    ;(api.get as any).mockRejectedValue(new Error('boom'))
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1')
    expect(store.error).toBe('boom')
    expect(store.loading).toBe(false)
  })

  it('URL-encodes projectName in both listEvents and loadMetadata request paths', async () => {
    ;(api.get as any).mockResolvedValue({
      json: async () => ({
        data: [],
        pagination: { page: 0, per_page: 50, total: 0, pages: 0 },
        recording_enabled: true,
        domains: [],
        event_types: [],
        categories: ['Budget', 'Members', 'Settings', 'Account'],
      }),
    })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj/weird name')
    await store.loadMetadata('proj/weird name')
    expect(api.get).toHaveBeenNthCalledWith(
      1,
      'v1/projects/proj%2Fweird%20name/activity-events',
      expect.anything()
    )
    expect(api.get).toHaveBeenNthCalledWith(
      2,
      'v1/projects/proj%2Fweird%20name/activity-events/metadata',
      expect.anything()
    )
  })

  it('loadMetadata failure does not clobber a preceding listEvents error field', async () => {
    const store = createProjectActivityEventsStore()
    store.error = null
    ;(api.get as any).mockRejectedValue(new Error('metadata down'))
    await store.loadMetadata('proj-1')
    expect(store.metadataError).toBe('metadata down')
    expect(store.error).toBeNull()
  })

  it('forwards domain, event_type and actor_id when provided', async () => {
    ;(api.get as any).mockResolvedValue({
      json: async () => ({
        data: [],
        pagination: { page: 0, per_page: 50, total: 0, pages: 0 },
        recording_enabled: true,
      }),
    })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1', {
      domain: ['project_management'],
      event_type: ['member_added'],
      actor_id: 'user-1',
    })
    const [, options] = (api.get as any).mock.calls[0]
    expect(options.params.domain).toEqual(['project_management'])
    expect(options.params.event_type).toEqual(['member_added'])
    expect(options.params.actor_id).toBe('user-1')
  })

  it('combines domain, event_type, actor_id with category/from/to/sort_dir in one call', async () => {
    ;(api.get as any).mockResolvedValue({
      json: async () => ({
        data: [],
        pagination: { page: 0, per_page: 50, total: 0, pages: 0 },
        recording_enabled: true,
      }),
    })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1', {
      category: ['Budget'],
      domain: ['budget_management'],
      event_type: ['x'],
      actor_id: 'user-1',
      from: '2026-01-01',
      to: '2026-01-02',
      sort_dir: 'asc',
    })
    const [, options] = (api.get as any).mock.calls[0]
    expect(options.params).toMatchObject({
      category: ['Budget'],
      domain: ['budget_management'],
      event_type: ['x'],
      actor_id: 'user-1',
      from: '2026-01-01',
      to: '2026-01-02',
      sort_dir: 'asc',
    })
  })

  it('omits actor_id, domain, event_type from query params when empty or absent', async () => {
    ;(api.get as any).mockResolvedValue({
      json: async () => ({
        data: [],
        pagination: { page: 0, per_page: 50, total: 0, pages: 0 },
        recording_enabled: true,
      }),
    })
    const store = createProjectActivityEventsStore()
    await store.listEvents('proj-1', { actor_id: '', domain: [], event_type: null })
    const [, options] = (api.get as any).mock.calls[0]
    expect(options.params.actor_id).toBeUndefined()
    expect(options.params.domain).toBeUndefined()
    expect(options.params.event_type).toBeUndefined()
  })

  it('does not let an older in-flight listEvents response overwrite a newer one', async () => {
    let resolveFirst: (value: unknown) => void
    let callCount = 0
    ;(api.get as any).mockImplementation(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve({
        json: async () => ({
          data: [
            {
              id: '2',
              domain: 'budget',
              event_type: 'y',
              label: 'Y',
              category: 'Budget',
              created_at: '2026-01-02T00:00:00Z',
            },
          ],
          pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
          recording_enabled: true,
        }),
      })
    })
    const store = createProjectActivityEventsStore()
    const first = store.listEvents('proj-1', { category: ['Budget'] })
    const second = store.listEvents('proj-1', { category: ['Members'] })
    await second
    expect(store.events[0].id).toBe('2')

    resolveFirst!({
      json: async () => ({
        data: [
          {
            id: '1',
            domain: 'members',
            event_type: 'x',
            label: 'X',
            category: 'Members',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
        recording_enabled: true,
      }),
    })
    await first
    expect(store.events[0].id).toBe('2')
    expect(store.error).toBeNull()
  })

  it('does not let an aborted listEvents request set an error, even when the abort rejects as a plain Error', async () => {
    // Mirrors what api.ts's error-wrapping does to a real fetch-abort DOMException: by the
    // time it reaches the store's catch, it is a plain Error with no `AbortError` name.
    let rejectFirst: (reason?: unknown) => void
    let callCount = 0
    ;(api.get as any).mockImplementation(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((_resolve, reject) => {
          rejectFirst = reject
        })
      }
      return Promise.resolve({
        json: async () => ({
          data: [
            {
              id: '2',
              domain: 'budget',
              event_type: 'y',
              label: 'Y',
              category: 'Budget',
              created_at: '2026-01-02T00:00:00Z',
            },
          ],
          pagination: { page: 0, per_page: 50, total: 1, pages: 1 },
          recording_enabled: true,
        }),
      })
    })
    const store = createProjectActivityEventsStore()
    const first = store.listEvents('proj-1', { category: ['Budget'] })
    const second = store.listEvents('proj-1', { category: ['Members'] })
    await second
    expect(store.events[0].id).toBe('2')

    rejectFirst!(new Error('aborted'))
    await first

    expect(store.error).toBeNull()
    expect(store.events[0].id).toBe('2')
  })

  it('does not let an older in-flight loadMetadata response overwrite a newer one', async () => {
    let resolveFirst: (value: unknown) => void
    let callCount = 0
    ;(api.get as any).mockImplementation(() => {
      callCount += 1
      if (callCount === 1) {
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve({
        json: async () => ({
          domains: [],
          event_types: [{ event_type: 'y', label: 'Y', category: 'Budget' }],
          recording_enabled: true,
        }),
      })
    })
    const store = createProjectActivityEventsStore()
    const first = store.loadMetadata('proj-1')
    const second = store.loadMetadata('proj-1')
    await second
    expect(store.metadata?.event_types[0].event_type).toBe('y')

    resolveFirst!({
      json: async () => ({
        domains: [],
        event_types: [{ event_type: 'x', label: 'X', category: 'Members' }],
        recording_enabled: true,
      }),
    })
    await first

    expect(store.metadata?.event_types[0].event_type).toBe('y')
    expect(store.metadataError).toBeNull()
  })
})
