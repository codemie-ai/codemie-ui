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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import {
  isTransientAnalysisError,
  toUaParams,
  usageAttributionStore,
} from '@/store/usageAttribution'
import type { AnalyticsQueryParams } from '@/types/analytics'
import type { UaError } from '@/types/usageAttribution'

import { UA_MAX_POLLS, UA_POLL_MS } from '../constants'

export interface UaQueryState<T> {
  data: T | null
  error: UaError | null
  loading: boolean
}

interface ScopedState<T> extends UaQueryState<T> {
  /** The parameters of the data without the settings and the Recompute nonce: the period and the widget's own. */
  scope: string | null
}

const scopeOf = (params: Record<string, unknown>): string => {
  const { overrides: _overrides, _r: _nonce, _p: _poll, ...rest } = params
  return JSON.stringify(rest)
}

/** The parameters without the poll nonce: a poll is the same request asked again. */
export const withoutPoll = (params: Record<string, unknown>): string => {
  const { _p: _poll, ...rest } = params
  return JSON.stringify(rest)
}

/** The period, the applied overrides and the nonces: the parameters every request of the tab carries. */
export const useUaBaseParams = (filters: AnalyticsQueryParams): Record<string, string | number> => {
  const { encodedOverrides, refreshNonce, pollNonce } = useSnapshot(usageAttributionStore)
  return useMemo(
    () => toUaParams(filters, encodedOverrides, refreshNonce, pollNonce),
    // Only the period and dates matter on this tab: project and user filters are never sent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.time_period,
      filters.start_date,
      filters.end_date,
      encodedOverrides,
      refreshNonce,
      pollNonce,
    ]
  )
}

/** Retries of a request answered "still being computed on another server" before the error is shown. */
const MAX_TRANSIENT_RETRIES = 3

const nextLoadingState =
  <T>(scope: string) =>
  (prev: ScopedState<T>): ScopedState<T> => ({
    data: prev.scope === scope ? prev.data : null,
    error: null,
    loading: true,
    scope,
  })

const nextResultState =
  <T>(scope: string, data: T | null, error: UaError | null) =>
  (prev: ScopedState<T>): ScopedState<T> => ({
    data: data ?? (error && prev.scope === scope ? prev.data : null),
    error,
    loading: false,
    scope,
  })

const nextErrorState =
  <T>(message: string) =>
  (prev: ScopedState<T>): ScopedState<T> => ({
    ...prev,
    error: { message },
    loading: false,
  })

const scheduleRetry = (fn: (attempt: number) => void, attempt: number, delayMs: number) =>
  setTimeout(() => fn(attempt), delayMs)

/**
 * One endpoint of the tab. A change of the parameters cancels the previous request, and leaving the view cancels
 * it too. The last data is kept while the same period reloads (new settings, Recompute) and on an error for the
 * same period, for example a 429 on custom settings; another period starts empty, so no widget shows one period
 * next to another. A 503 that only says the analysis is still being computed elsewhere is retried after its
 * Retry-After, a few times, with the spinner on.
 */
export const useUaQuery = <T>(
  key: string,
  path: string | null,
  params: Record<string, unknown>
): UaQueryState<T> => {
  const [state, setState] = useState<ScopedState<T>>({
    data: null,
    error: null,
    loading: !!path,
    scope: null,
  })
  const paramsKey = JSON.stringify(params)
  const scope = scopeOf(params)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      active = false
      if (timer) clearTimeout(timer)
      usageAttributionStore.cancel(key)
    }
    if (!path) {
      setState({ data: null, error: null, loading: false, scope })
    } else {
      const load = (attempt: number) => {
        setState(nextLoadingState(scope))
        usageAttributionStore
          .get<T>(key, path, params)
          .then(({ data, error, aborted }) => {
            if (!active || aborted) return
            if (isTransientAnalysisError(error)) {
              if (attempt < MAX_TRANSIENT_RETRIES) {
                timer = scheduleRetry(load, attempt + 1, (error?.retryAfter ?? 10) * 1000)
                return
              }
              if (error) usageAttributionStore.reportAnalysisError(error)
            }
            setState(nextResultState(scope, data, error))
          })
          .catch((error: unknown) => {
            if (!active) return
            setState(nextErrorState(String(error)))
          })
      }
      load(0)
    }
    return stop
    // `params` is compared by value through paramsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path, paramsKey])

  // Before the effect has started the request of a new period, nothing of the previous one is shown.
  const current = state.scope === scope
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: current ? state.loading : !!path,
  }
}

/**
 * The page of a table: it belongs to the parameters it was chosen for, so another period starts on the first page.
 * A poll asks the same again, so the page stays.
 */
export const useUaPage = (params: Record<string, unknown>): [number, (page: number) => void] => {
  const key = withoutPoll(params)
  const [state, setState] = useState({ page: 0, key })
  const setPage = useCallback((page: number) => setState({ page, key }), [key])
  return [state.key === key ? state.page : 0, setPage]
}

/**
 * While a newer analysis is computed the previous one is shown: every widget asks again every UA_POLL_MS until the
 * new one is there, at most UA_MAX_POLLS times for a period and settings. An analysis that is not refreshing, such as
 * an earlier one shown with the limit reached, stops it.
 */
export const useUaPolling = (): void => {
  const { lastAnalysis } = useSnapshot(usageAttributionStore)
  useEffect(() => {
    const wanted = !!lastAnalysis?.refreshing && usageAttributionStore.polls < UA_MAX_POLLS
    const id = wanted ? setTimeout(() => usageAttributionStore.poll(), UA_POLL_MS) : undefined
    return () => {
      if (id) clearTimeout(id)
    }
  }, [lastAnalysis])
}
