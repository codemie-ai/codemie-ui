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

import { proxy } from 'valtio'

import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  UaAnalysisInfo,
  UaError,
  UaErrorBody,
  UaRange,
  UaSettingValue,
  UaSettingsSchema,
} from '@/types/usageAttribution'
import api from '@/utils/api'

const BASE = 'v1/analytics/usage-attribution'
/** Endpoints answered without the analysis (Elasticsearch totals only). */
const FAST_PATHS = new Set(['totals'])
/** Statuses that mean the analysis itself is unavailable: still computing, failed, timed out, or limited. */
const ANALYSIS_STATUSES = new Set([429, 503, 504])
/**
 * The analysis-backed lists and summaries of the tab: any failure of theirs (an HTTP error or a network error) leaves
 * the analysis unavailable. Not the popups of one person, project or group: their 404 says nothing of the analysis.
 */
const ANALYSIS_PATHS = new Set([
  'cli-summary',
  'shared-projects',
  'repository-groups',
  'people',
  'breakdown',
  'status',
])
/** The longest Retry-After of a 503 that only means "another server is still computing it". */
const TRANSIENT_RETRY_AFTER_S = 15

/** The analysis is still being computed elsewhere: worth asking again shortly, without reporting an error. */
export const isTransientAnalysisError = (error: UaError | null): boolean =>
  !!error &&
  error.status === 503 &&
  !!error.retryAfter &&
  error.retryAfter > 0 &&
  error.retryAfter <= TRANSIENT_RETRY_AFTER_S

/** Usage Attribution never sends project or user filters: the tab always attributes all usage. */
export const toUaParams = (
  filters: AnalyticsQueryParams,
  encodedOverrides: string | null,
  refreshNonce: number,
  pollNonce = 0
): Record<string, string | number> => {
  const params: Record<string, string | number> = {}
  if (filters.time_period) params.time_period = String(filters.time_period)
  if (filters.start_date) params.start_date = String(filters.start_date)
  if (filters.end_date) params.end_date = String(filters.end_date)
  if (encodedOverrides) params.overrides = encodedOverrides
  // Bypasses the browser cache after Recompute; the API ignores it.
  if (refreshNonce) params._r = refreshNonce
  // Asks again while a newer analysis is computed; the API ignores it too.
  if (pollNonce) params._p = pollNonce
  return params
}

/**
 * The seconds to wait: `retry_after` of the body first, then the Retry-After header. The browser hides the header
 * when the UI and the API are on different origins; the body is always readable.
 */
const retryAfterOf = (response: Response, body: UaErrorBody | undefined): number | null => {
  const value = body?.retry_after ?? response.headers.get('Retry-After')
  if (value === null || value === undefined || value === '') return null
  const seconds = Number(value)
  return Number.isFinite(seconds) ? seconds : null
}

const parseError = async (error: unknown, fallback: string): Promise<UaError> => {
  if (error instanceof Response) {
    const parsed = (error as Response & { parsedError?: UaErrorBody }).parsedError
    return {
      message: parsed?.message ?? fallback,
      details: parsed?.details,
      help: parsed?.help,
      status: error.status,
      retryAfter: retryAfterOf(error, parsed),
    }
  }
  if (error instanceof Error) return { message: error.message || fallback }
  return { message: fallback }
}

const ABORTED = { data: null, error: null, aborted: true } as const

/** An error that says the analysis itself is unavailable (not a transient "still computing" one). */
const blocksAnalysis = (path: string, error: UaError): boolean => {
  if (isTransientAnalysisError(error)) return false
  if (error.status && ANALYSIS_STATUSES.has(error.status)) return !FAST_PATHS.has(path)
  return ANALYSIS_PATHS.has(path)
}

/** The range and the analysis behind a response, for the status line. */
const recordResponse = (data: unknown): void => {
  if (!data || typeof data !== 'object') return
  const { range, analysis } = data as { range?: UaRange | null; analysis?: UaAnalysisInfo | null }
  if (range) usageAttributionStore.lastRange = range
  if (analysis) {
    usageAttributionStore.lastAnalysis = analysis
    usageAttributionStore.analysisError = null
  }
}

interface UsageAttributionState {
  controllers: Map<string, AbortController>
  generations: Map<string, number>
  /** Incremented by Recompute: every widget reloads. */
  refreshNonce: number
  /** Incremented while a newer analysis is computed: every widget asks again, keeping what it shows. */
  pollNonce: number
  /** Polls since the period or the settings changed. */
  polls: number
  /** The latest analysis behind any response, for the analysis time line. */
  lastAnalysis: UaAnalysisInfo | null
  /** Why the analysis is unavailable, from the latest analysis-backed request that failed. */
  analysisError: UaError | null
  /** The range the API used for the current period (clamped to the longest range it supports). */
  lastRange: UaRange | null
  settingsSchema: UaSettingsSchema | null
  settingsError: UaError | null
  /** The overrides applied on this tab (kept in the browser by useSettingsOverrides). */
  overrides: Record<string, UaSettingValue>
  encodedOverrides: string | null
  get: <T>(
    key: string,
    path: string,
    params: Record<string, unknown>
  ) => Promise<{ data: T | null; error: UaError | null; aborted: boolean }>
  loadSettings: () => Promise<UaSettingsSchema | null>
  refresh: (params: Record<string, unknown>) => Promise<UaError | null>
  setOverrides: (overrides: Record<string, UaSettingValue>, encoded: string | null) => void
  /** Forget the analysis status: the period, the settings or Recompute changed. */
  resetAnalysisStatus: () => void
  /** Ask every widget again (a newer analysis is being computed). */
  poll: () => void
  /** A widget gave up on the analysis (for example after its retries): the status line says why. */
  reportAnalysisError: (error: UaError) => void
  /** Abort the request in flight for a key (its widget went away). */
  cancel: (key: string) => void
}

export const usageAttributionStore = proxy<UsageAttributionState>({
  controllers: new Map(),
  generations: new Map(),
  refreshNonce: 0,
  pollNonce: 0,
  polls: 0,
  lastAnalysis: null,
  analysisError: null,
  lastRange: null,
  settingsSchema: null,
  settingsError: null,
  overrides: {},
  encodedOverrides: null,

  /**
   * GET one endpoint of the tab. A newer request with the same key aborts the older one, and a response that is
   * no longer the latest for its key is dropped.
   */
  async get<T>(key: string, path: string, params: Record<string, unknown>) {
    this.controllers.get(key)?.abort()
    const controller = new AbortController()
    this.controllers.set(key, controller)
    const generation = (this.generations.get(key) ?? 0) + 1
    this.generations.set(key, generation)
    const superseded = () => this.generations.get(key) !== generation
    try {
      const response = await api.get(`${BASE}/${path}`, {
        params,
        skipErrorHandling: true,
        signal: controller.signal,
      })
      if (superseded()) return ABORTED
      const data = (await response.json()) as T
      // A newer request may have started while the body was read.
      if (superseded()) return ABORTED
      recordResponse(data)
      return { data, error: null, aborted: false }
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError' || superseded()) return ABORTED
      const parsed = await parseError(error, 'Failed to load usage attribution')
      if (blocksAnalysis(path, parsed)) this.analysisError = parsed
      return { data: null, error: parsed, aborted: false }
    } finally {
      if (this.controllers.get(key) === controller) this.controllers.delete(key)
    }
  },

  async loadSettings() {
    try {
      const response = await api.get(`${BASE}/settings`, { skipErrorHandling: true })
      const body = (await response.json()) as { data: UaSettingsSchema }
      this.settingsSchema = body.data
      this.settingsError = null
      return body.data
    } catch (error: unknown) {
      this.settingsError = await parseError(error, 'Failed to load the analysis settings')
      return null
    }
  },

  async refresh(params: Record<string, unknown>) {
    try {
      await api.post(`${BASE}/refresh`, undefined, { params, skipErrorHandling: true })
      this.refreshNonce += 1
      return null
    } catch (error: unknown) {
      return parseError(error, 'Failed to recompute the analysis')
    }
  },

  setOverrides(overrides: Record<string, UaSettingValue>, encoded: string | null) {
    this.overrides = overrides
    this.encodedOverrides = encoded
  },

  resetAnalysisStatus() {
    this.lastAnalysis = null
    this.analysisError = null
    this.lastRange = null
    this.polls = 0
  },

  poll() {
    this.pollNonce += 1
    this.polls += 1
  },

  reportAnalysisError(error: UaError) {
    this.analysisError = error
  },

  cancel(key: string) {
    this.controllers.get(key)?.abort()
    this.controllers.delete(key)
    // A response already on its way is dropped too.
    this.generations.set(key, (this.generations.get(key) ?? 0) + 1)
  },
})
