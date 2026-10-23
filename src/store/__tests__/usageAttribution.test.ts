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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isTransientAnalysisError, usageAttributionStore } from '@/store/usageAttribution'
import type { UaErrorBody } from '@/types/usageAttribution'
import api from '@/utils/api'

/** What api.get rejects with for an HTTP error: the Response with the parsed `error` of its body. */
const errorResponse = (
  status: number,
  error: UaErrorBody,
  headers: Record<string, string> = {}
): Response =>
  Object.assign(
    new Response(JSON.stringify({ error }), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    }),
    { parsedError: error }
  )

const okResponse = (body: unknown): Response =>
  ({ json: () => Promise.resolve(body) } as unknown as Response)

const ANALYSIS = {
  computed_at: '2026-10-14T08:00:00Z',
  duration_ms: 1200,
  stale: false,
  refreshing: false,
  error: null,
}

const get = (path: string) => usageAttributionStore.get(`key-${path}`, path, {})

describe('usageAttributionStore.get — the analysis time line error', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    usageAttributionStore.resetAnalysisStatus()
  })

  it.each([400, 403, 404, 422, 500])(
    'reports a %i of an analysis-backed request with its message and details',
    async (status) => {
      vi.mocked(api.get).mockRejectedValueOnce(
        errorResponse(status, { message: 'Analysis failed', details: 'The query was rejected' })
      )

      await get('cli-summary')

      expect(usageAttributionStore.analysisError).toMatchObject({
        message: 'Analysis failed',
        details: 'The query was rejected',
        status,
      })
    }
  )

  it.each(['cli-summary', 'shared-projects', 'repository-groups', 'people', 'breakdown', 'status'])(
    'reports a failed %s request',
    async (path) => {
      vi.mocked(api.get).mockRejectedValueOnce(errorResponse(500, { message: 'Server error' }))

      await get(path)

      expect(usageAttributionStore.analysisError?.message).toBe('Server error')
    }
  )

  it('reports a network error as "Failed to fetch"', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await get('shared-projects')

    expect(usageAttributionStore.analysisError?.message).toBe('Failed to fetch')
  })

  it('ignores a failed /totals request: it does not need the analysis', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(errorResponse(500, { message: 'Server error' }))

    await get('totals')

    expect(usageAttributionStore.analysisError).toBeNull()
  })

  it.each(['people/u-1', 'shared-projects/Project%20A', 'repository-groups/g-1'])(
    'ignores a 404 of the popup request %s',
    async (path) => {
      vi.mocked(api.get).mockRejectedValueOnce(errorResponse(404, { message: 'Not found' }))

      await get(path)

      expect(usageAttributionStore.analysisError).toBeNull()
    }
  )

  it('ignores an aborted request', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    )

    await get('people')

    expect(usageAttributionStore.analysisError).toBeNull()
  })

  it('still reports a 429 with its Retry-After', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      errorResponse(429, { message: 'Too many analyses' }, { 'Retry-After': '2520' })
    )

    await get('people')

    expect(usageAttributionStore.analysisError).toMatchObject({
      message: 'Too many analyses',
      status: 429,
      retryAfter: 2520,
    })
  })

  it('does not report a 503 that only says the analysis is still computed elsewhere', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      errorResponse(503, { message: 'Still computing' }, { 'Retry-After': '10' })
    )

    await get('cli-summary')

    expect(usageAttributionStore.analysisError).toBeNull()
  })

  it('clears the error when a later request of the analysis succeeds', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(errorResponse(500, { message: 'Server error' }))
    await get('cli-summary')
    expect(usageAttributionStore.analysisError?.message).toBe('Server error')

    vi.mocked(api.get).mockResolvedValueOnce(okResponse({ data: {}, analysis: ANALYSIS }))
    await get('cli-summary')

    expect(usageAttributionStore.analysisError).toBeNull()
    expect(usageAttributionStore.lastAnalysis?.computed_at).toBe(ANALYSIS.computed_at)
  })
})

describe('usageAttributionStore — the time to wait of an error', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    usageAttributionStore.resetAnalysisStatus()
  })

  it('reads retry_after of the body when the Retry-After header is hidden (another origin)', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      errorResponse(429, { message: 'Too many analyses', retry_after: 2520 })
    )

    const { error } = await get('people')

    expect(error?.retryAfter).toBe(2520)
    expect(usageAttributionStore.analysisError).toMatchObject({ status: 429, retryAfter: 2520 })
  })

  it('prefers retry_after of the body to the Retry-After header', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      errorResponse(504, { message: 'Timed out', retry_after: 90 }, { 'Retry-After': '30' })
    )

    const { error } = await get('cli-summary')

    expect(error?.retryAfter).toBe(90)
  })

  it.each([
    ['without retry_after', { message: 'Too many analyses' }],
    ['with retry_after null', { message: 'Too many analyses', retry_after: null }],
  ])('falls back to the Retry-After header %s in the body', async (_case, body) => {
    vi.mocked(api.get).mockRejectedValueOnce(errorResponse(429, body, { 'Retry-After': '42' }))

    const { error } = await get('people')

    expect(error?.retryAfter).toBe(42)
  })

  it('has no time to wait without retry_after or the header', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(errorResponse(500, { message: 'Server error' }))

    const { error } = await get('people')

    expect(error?.retryAfter).toBeNull()
  })

  it('treats a "still computing" 503 with retry_after only in the body as transient', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(
      errorResponse(503, { message: 'Still computing', retry_after: 10 })
    )

    const { error } = await get('cli-summary')

    expect(isTransientAnalysisError(error)).toBe(true)
    expect(usageAttributionStore.analysisError).toBeNull()
  })

  it('reads retry_after of the body for a refused Recompute', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      errorResponse(429, { message: 'Recompute was requested too recently', retry_after: 42 })
    )

    const error = await usageAttributionStore.refresh({ time_period: 'last_30_days' })

    expect(error).toMatchObject({ status: 429, retryAfter: 42 })
  })
})
