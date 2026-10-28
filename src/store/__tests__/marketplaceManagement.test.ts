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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { overviewFixture } from '@/test-utils/fixtures/marketplace'

const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
const mockApiPut = vi.fn()
const mockApiDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
    delete: (...args: unknown[]) => mockApiDelete(...args),
  },
}))

function resetStore() {
  marketplaceManagementStore.entityKind = 'ASSISTANT'
  marketplaceManagementStore.isLoadingOverview = false
  marketplaceManagementStore.overview = null
  marketplaceManagementStore.facets = null
  marketplaceManagementStore.assessments = {}
  marketplaceManagementStore.cleanup.items = []
  marketplaceManagementStore.cleanup.total = 0
  marketplaceManagementStore.cleanup.page = 1
  marketplaceManagementStore.cleanup.pageSize = 20
  // 'ALL' is the real production default (see cleanup.bucket's initial value
  // in the store) — resetting to '' here would hide a regression where
  // loadCleanup() sends the UI sentinel 'ALL' to the backend verbatim
  // instead of translating it to the wire value '' (EPMCDME-14234, CR-001).
  marketplaceManagementStore.cleanup.bucket = 'ALL'
  marketplaceManagementStore.cleanup.reason = null
  marketplaceManagementStore.cleanup.tier = null
  marketplaceManagementStore.cleanup.mcp = null
  marketplaceManagementStore.cleanup.category = null
  marketplaceManagementStore.cleanup.query = ''
  marketplaceManagementStore.cleanup.selected = new Set()
  marketplaceManagementStore.isAuditing = false
  marketplaceManagementStore.auditStartedAt = null
  marketplaceManagementStore.auditError = null
  marketplaceManagementStore.auditStatus = null
  marketplaceManagementStore.auditEsDocCount = null
}

describe('marketplaceManagementStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
    // The audit poll loop sleeps between status reads; fake timers keep the
    // test from actually waiting 3s per poll.
    vi.useFakeTimers()
  })

  afterEach(async () => {
    // A test that left an audit "running" also left the module-level poll
    // loop alive; release it here so test order cannot change the number of
    // status reads the next test observes.
    marketplaceManagementStore.isAuditing = false
    await vi.advanceTimersByTimeAsync(4000)
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('setCleanupBucket updates bucket and resets page to 1', () => {
    marketplaceManagementStore.cleanup.page = 5

    marketplaceManagementStore.setCleanupBucket('DELETE')

    expect(marketplaceManagementStore.cleanup.bucket).toBe('DELETE')
    expect(marketplaceManagementStore.cleanup.page).toBe(1)
  })

  it('setCleanupMcp updates mcp and resets page to 1', () => {
    marketplaceManagementStore.cleanup.page = 3

    marketplaceManagementStore.setCleanupMcp('some-mcp')

    expect(marketplaceManagementStore.cleanup.mcp).toBe('some-mcp')
    expect(marketplaceManagementStore.cleanup.page).toBe(1)
  })

  it('setCleanupCategory updates category and resets page to 1', () => {
    marketplaceManagementStore.cleanup.page = 7

    marketplaceManagementStore.setCleanupCategory('AI Tools')

    expect(marketplaceManagementStore.cleanup.category).toBe('AI Tools')
    expect(marketplaceManagementStore.cleanup.page).toBe(1)
  })

  it('resetCleanupFilters clears filters, sets bucket to ALL, and resets page to 1', () => {
    marketplaceManagementStore.cleanup.mcp = 'some-mcp'
    marketplaceManagementStore.cleanup.category = 'AI'
    marketplaceManagementStore.cleanup.bucket = 'VERIFIED'
    marketplaceManagementStore.cleanup.reason = 'obsolete'
    marketplaceManagementStore.cleanup.tier = 'high'
    marketplaceManagementStore.cleanup.query = 'search term'
    marketplaceManagementStore.cleanup.page = 6

    marketplaceManagementStore.resetCleanupFilters()

    expect(marketplaceManagementStore.cleanup.mcp).toBeNull()
    expect(marketplaceManagementStore.cleanup.category).toBeNull()
    // ALL (COMMUNITY + DELETE, never VERIFIED) is the canonical default.
    expect(marketplaceManagementStore.cleanup.bucket).toBe('ALL')
    expect(marketplaceManagementStore.cleanup.reason).toBeNull()
    expect(marketplaceManagementStore.cleanup.tier).toBeNull()
    expect(marketplaceManagementStore.cleanup.query).toBe('')
    expect(marketplaceManagementStore.cleanup.page).toBe(1)
  })

  it('loadOverview populates state.overview from api.get', async () => {
    // The captured GET /overview body, not an invented literal: the previous
    // one declared `cleanup_reasons: { DUPLICATE }` and `usage_tiers: { HIGH }`,
    // neither of which is a value the backend can emit (F-44). A store test
    // that round-trips a fictional payload proves nothing about the contract.
    const mockOverview = overviewFixture

    mockApiGet.mockResolvedValueOnce({
      json: async () => mockOverview,
    })

    await marketplaceManagementStore.loadOverview()

    expect(marketplaceManagementStore.overview).toEqual(mockOverview)
    // Spot-check the vocabularies survived the round trip with real values.
    expect(Object.keys(mockOverview.cleanup_reasons ?? {})).not.toHaveLength(0)
    expect(Object.keys(mockOverview.usage_tiers ?? {})).not.toHaveLength(0)
    expect(marketplaceManagementStore.isLoadingOverview).toBe(false)
    // The overview renders its own inline error banner, so it opts out of the
    // global toast to avoid reporting one failure twice.
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining('v1/marketplace-management/entities/assistants/overview'),
      { skipErrorHandling: true }
    )
  })

  it('assessWithAI keeps the result for its own assistant while the drawer is elsewhere', async () => {
    let resolveA: (v: unknown) => void = () => undefined
    mockApiPost.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveA = resolve
      })
    )
    mockApiPost.mockReturnValueOnce(
      new Promise(() => {
        /* never settles: B is still assessing */
      })
    )

    const pendingA = marketplaceManagementStore.assessWithAI('assistant-a')
    marketplaceManagementStore.assessWithAI('assistant-b')
    expect(marketplaceManagementStore.assessments['assistant-a'].isAssessing).toBe(true)

    resolveA({ json: async () => ({ overall_score: 10 }) })
    await pendingA

    expect(marketplaceManagementStore.assessments['assistant-a']).toMatchObject({
      isAssessing: false,
      assessment: { overall_score: 10 },
    })
    // B's loading state is untouched by A's response and has no result.
    expect(marketplaceManagementStore.assessments['assistant-b']).toMatchObject({
      isAssessing: true,
      assessment: null,
    })
  })

  it('assessWithAI joins a running request instead of calling the provider twice', async () => {
    mockApiPost.mockReturnValueOnce(
      new Promise(() => {
        /* never settles */
      })
    )

    const first = marketplaceManagementStore.assessWithAI('assistant-a')
    const second = marketplaceManagementStore.assessWithAI('assistant-a')

    expect(second).toBe(first)
    expect(mockApiPost).toHaveBeenCalledTimes(1)
  })

  it('assessWithAI populates state.assessments[aid] from api.post', async () => {
    const mockAssessment = {
      overall_score: 85,
      verdict_recommendation: 'VERIFIED' as const,
      dimensions: {
        quality: { score: 90, justification: 'Good quality', suggested_fix: '' },
      },
      suggested_fixes: ['Improve description'],
    }

    mockApiPost.mockResolvedValueOnce({
      json: async () => mockAssessment,
    })

    await marketplaceManagementStore.assessWithAI('assistant-123')

    expect(marketplaceManagementStore.assessments['assistant-123']).toEqual({
      isAssessing: false,
      assessment: mockAssessment,
      error: null,
    })
    expect(mockApiPost).toHaveBeenCalledWith(
      expect.stringContaining('assistant-123'),
      expect.any(Object),
      { skipErrorHandling: true }
    )
  })

  it('approveBulk reports per-item outcomes instead of rejecting on the first failure', async () => {
    mockApiPost
      .mockResolvedValueOnce({ json: async () => ({}) })
      .mockRejectedValueOnce({ parsedError: { message: 'Assistant already approved' } })
      .mockResolvedValueOnce({ json: async () => ({}) })

    const result = await marketplaceManagementStore.approveBulk(['a', 'b', 'c'])

    expect(result.succeeded).toEqual(['a', 'c'])
    expect(result.failed).toEqual([{ id: 'b', message: 'Assistant already approved' }])
    // All three requests are issued — a failure must not cancel the rest.
    expect(mockApiPost).toHaveBeenCalledTimes(3)
  })

  it('loadCleanup translates the "ALL" bucket sentinel to the wire value "" instead of sending it verbatim', async () => {
    // 'ALL' ("every bucket") is a UI-only sentinel — see ALL_BUCKETS in
    // useMarketplaceFilters.ts. The generated Bucket-Input enum for GET
    // /cleanup has no 'ALL' member (only 'VERIFIED' | 'COMMUNITY' | 'DELETE'
    // | ''), and an unrecognised bucket value is a 422. resetStore() above
    // already leaves cleanup.bucket at 'ALL', matching the store's real
    // default, so this exercises exactly the queue's fresh-load request.
    mockApiGet.mockResolvedValueOnce({
      json: async () => ({ total: 0, page: 1, page_size: 20, items: [] }),
    })

    await marketplaceManagementStore.loadCleanup()

    const url = new URL(mockApiGet.mock.calls[0][0] as string, 'http://localhost')
    expect(url.searchParams.get('bucket')).toBe('')
  })

  it('loadCleanup surfaces the parsed API message, not "[object Response]"', async () => {
    // api rejects with a Response-like object carrying parsedError.
    mockApiGet.mockRejectedValueOnce({ parsedError: { message: 'Upstream timeout' } })

    await marketplaceManagementStore.loadCleanup()

    expect(marketplaceManagementStore.cleanup.loadError).toBe('Upstream timeout')
  })

  it('loadCleanup ignores a superseded response', async () => {
    let resolveFirst: (v: unknown) => void = () => {}
    const first = new Promise((r) => {
      resolveFirst = r
    })
    mockApiGet.mockReturnValueOnce(first).mockResolvedValueOnce({
      json: async () => ({ total: 1, page: 1, page_size: 20, items: [{ id: 'new' }] }),
    })

    const firstCall = marketplaceManagementStore.loadCleanup()
    const secondCall = marketplaceManagementStore.loadCleanup()
    await secondCall
    // The stale first request lands last and must not overwrite the newer rows.
    resolveFirst({
      json: async () => ({ total: 9, page: 1, page_size: 20, items: [{ id: 'stale' }] }),
    })
    await firstCall

    expect(marketplaceManagementStore.cleanup.items).toEqual([{ id: 'new' }])
    expect(marketplaceManagementStore.cleanup.total).toBe(1)
  })

  it('runAudit returns without waiting for the audit and adopts the server status', async () => {
    // POST /audit/run answers 202 as soon as the run is queued.
    mockApiPost.mockResolvedValueOnce({
      json: async () => ({
        is_running: true,
        run_id: 'r1',
        started_at: 1000,
        finished_at: null,
        error: null,
      }),
    })
    // First poll: still running. Second poll: finished. Then overview+facets.
    mockApiGet
      .mockResolvedValueOnce({
        json: async () => ({
          is_running: false,
          run_id: 'r1',
          started_at: 1000,
          finished_at: 1100,
          error: null,
        }),
      })
      .mockResolvedValue({ json: async () => ({}) })

    const run = marketplaceManagementStore.runAudit()
    await vi.advanceTimersByTimeAsync(3000)
    await run

    expect(mockApiPost).toHaveBeenCalledWith(
      expect.stringContaining('marketplace-management/entities/assistants/audit/run'),
      {},
      { skipErrorHandling: true }
    )
    expect(marketplaceManagementStore.isAuditing).toBe(false)
  })

  it('refreshAuditStatus adopts a run started elsewhere', async () => {
    mockApiGet.mockResolvedValueOnce({
      json: async () => ({
        is_running: true,
        run_id: 'r9',
        started_at: 1500,
        finished_at: null,
        error: null,
      }),
    })

    await marketplaceManagementStore.refreshAuditStatus()

    // This is what makes the button correct after a reload, and for a second
    // admin who never clicked anything.
    expect(marketplaceManagementStore.isAuditing).toBe(true)
    // started_at is epoch seconds server-side; the store holds milliseconds.
    expect(marketplaceManagementStore.auditStartedAt).toBe(1500 * 1000)
  })

  // F-63: an audit started by another admin (or by this admin before a
  // reload) is discovered by `refreshAuditStatus`, which is called on mount.
  // Adopting `is_running` without following the run left the button on
  // "Running audit..." forever — nothing else ever polls, so the page was
  // stale until a manual reload, in exactly the multi-admin case the feature
  // exists for.
  it("starts polling when another admin's audit is already running", async () => {
    mockApiGet
      // Mount: the server reports a run this tab never started.
      .mockResolvedValueOnce({
        json: async () => ({
          is_running: true,
          run_id: 'r-other-admin',
          started_at: 1500,
          finished_at: null,
          error: null,
        }),
      })
      // The poll that must happen without any further user action.
      .mockResolvedValueOnce({
        json: async () => ({
          is_running: false,
          run_id: 'r-other-admin',
          started_at: 1500,
          finished_at: 1600,
          error: null,
        }),
      })
      .mockResolvedValue({ json: async () => ({}) })

    await marketplaceManagementStore.refreshAuditStatus()

    // Adopted, and NOT awaited: discovering a foreign run must not block the
    // caller (the layout mount effect) for the length of the audit.
    expect(marketplaceManagementStore.isAuditing).toBe(true)
    expect(mockApiGet).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3000)

    const urls = mockApiGet.mock.calls.map((c) => c[0] as string)
    expect(urls.filter((u) => u.includes('/audit/status'))).toHaveLength(2)
    // The run finished, so the button is released without a reload…
    expect(marketplaceManagementStore.isAuditing).toBe(false)
    // …and the numbers it produced are pulled in, which is the only refresh
    // an admin who never clicked "Run audit" ever gets.
    expect(urls.filter((u) => u.endsWith('/overview'))).toHaveLength(1)
    expect(urls.filter((u) => u.endsWith('/facets'))).toHaveLength(1)
  })

  it('does not start a second poll loop for a run it is already following', async () => {
    mockApiGet.mockResolvedValue({
      json: async () => ({
        is_running: true,
        run_id: 'r-long',
        started_at: 1500,
        finished_at: null,
        error: null,
      }),
    })

    await marketplaceManagementStore.refreshAuditStatus()
    await marketplaceManagementStore.refreshAuditStatus()
    await marketplaceManagementStore.refreshAuditStatus()

    // Three status reads requested, three performed. If each one kicked its
    // own loop, the next tick would fire three polls instead of one and the
    // endpoint would be hit N-times-per-interval for the rest of the run.
    expect(mockApiGet).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(3000)
    expect(mockApiGet).toHaveBeenCalledTimes(4)

    // Release the loop so it does not leak into the next test.
    mockApiGet.mockResolvedValue({
      json: async () => ({
        is_running: false,
        run_id: 'r-long',
        started_at: 1500,
        finished_at: 1600,
        error: null,
      }),
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(marketplaceManagementStore.isAuditing).toBe(false)
  })

  // Phase 9.2 records a degraded run as PARTIAL (similarity unavailable, so
  // the verdicts are computed against a subset). `error` stays null for such a
  // run, so without this the store reports the same clean success as a full
  // pass and the admin acts on numbers that silently exclude most of the
  // catalogue. NOTE: the live backend does not emit `status`/`es_doc_count` on
  // /audit/status yet (see impl-9.5.md) — this path is forward-compatible and
  // inert until it does.
  it('does not report a PARTIAL audit as a clean success', async () => {
    mockApiPost.mockResolvedValueOnce({
      json: async () => ({
        is_running: false,
        run_id: 'r-partial',
        started_at: 1,
        finished_at: 2,
        error: null,
        status: 'PARTIAL',
        es_doc_count: 18,
      }),
    })
    mockApiGet.mockResolvedValue({ json: async () => ({}) })

    // It must NOT reject: a PARTIAL run still produced verdicts, so the
    // refresh has to happen. What must not happen is the caller being unable
    // to tell it apart from a full pass.
    await marketplaceManagementStore.runAudit()

    expect(marketplaceManagementStore.auditStatus).toBe('PARTIAL')
    expect(marketplaceManagementStore.auditEsDocCount).toBe(18)
    expect(marketplaceManagementStore.isAuditing).toBe(false)
  })

  it('reports a SUCCEEDED audit as a clean success', async () => {
    mockApiPost.mockResolvedValueOnce({
      json: async () => ({
        is_running: false,
        run_id: 'r-ok',
        started_at: 1,
        finished_at: 2,
        error: null,
        status: 'SUCCEEDED',
        es_doc_count: 282,
      }),
    })
    mockApiGet.mockResolvedValue({ json: async () => ({}) })

    await marketplaceManagementStore.runAudit()

    expect(marketplaceManagementStore.auditStatus).toBe('SUCCEEDED')
    expect(marketplaceManagementStore.auditEsDocCount).toBe(282)
  })

  it('surfaces an audit that failed on the worker thread', async () => {
    mockApiPost.mockResolvedValueOnce({
      json: async () => ({
        is_running: false,
        run_id: 'r2',
        started_at: 1,
        finished_at: 2,
        error: 'embedding backend unavailable',
      }),
    })

    await expect(marketplaceManagementStore.runAudit()).rejects.toThrow(
      'embedding backend unavailable'
    )
    expect(marketplaceManagementStore.isAuditing).toBe(false)
  })

  it('withdrawBulk sends one POST to bulk-unpublish instead of N individual requests', async () => {
    const aids = ['id-1', 'id-2', 'id-3']
    marketplaceManagementStore.cleanup.selected = new Set(aids)
    mockApiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unpublished: 3, failed: [] }),
    })

    await marketplaceManagementStore.withdrawBulk(aids)

    // One POST call only
    expect(mockApiPost).toHaveBeenCalledTimes(1)
    expect(mockApiPost).toHaveBeenCalledWith(
      expect.stringContaining('bulk-unpublish'),
      { entity_ids: aids },
      expect.anything()
    )
    // Selected cleared
    expect(marketplaceManagementStore.cleanup.selected.size).toBe(0)
  })

  it('withdrawBulk on a partial failure keeps the failed ids selected instead of clearing them (EPMCDME-14234, CR-011)', async () => {
    // The endpoint answers 200 with per-entity outcomes (not a rejected
    // promise) when some ids fail — see the store's own comment above
    // withdrawBulk. `response.ok` is still true, so the naive
    // `if (response.ok) selected = new Set()` path would wrongly clear
    // every id, including the one the response says failed.
    const aids = ['id-1', 'id-2', 'id-3']
    marketplaceManagementStore.cleanup.selected = new Set(aids)
    mockApiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        unpublished: 2,
        failed: [{ entity_id: 'id-2', message: 'Assistant already unpublished' }],
      }),
    })

    const result = await marketplaceManagementStore.withdrawBulk(aids)

    expect(result.failed).toEqual([{ entity_id: 'id-2', message: 'Assistant already unpublished' }])
    // The failed id must still be selected so the admin can see and retry
    // it; only the ids the response actually reports as succeeded should
    // drop out of the selection.
    expect(marketplaceManagementStore.cleanup.selected.has('id-2')).toBe(true)
    expect(marketplaceManagementStore.cleanup.selected.has('id-1')).toBe(false)
    expect(marketplaceManagementStore.cleanup.selected.has('id-3')).toBe(false)
  })

  it('withdrawBulk propagates an outright request failure instead of clearing the selection', async () => {
    // Distinct from the partial-failure case above: here the POST itself
    // rejects (e.g. a 5xx before any per-entity processing), so there is
    // no response body to read `failed` from at all.
    const aids = ['id-1', 'id-2']
    marketplaceManagementStore.cleanup.selected = new Set(aids)
    mockApiPost.mockRejectedValueOnce({ parsedError: { message: 'Upstream timeout' } })

    await expect(marketplaceManagementStore.withdrawBulk(aids)).rejects.toBeTruthy()

    // The selection must survive an outright failure — clearing it here
    // would tell the admin the withdraw succeeded when nothing happened.
    expect(marketplaceManagementStore.cleanup.selected).toEqual(new Set(aids))
  })
})
