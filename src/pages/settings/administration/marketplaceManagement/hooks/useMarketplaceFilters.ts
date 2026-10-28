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

import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { Bucket } from '@/types/generated/marketplaceManagement'

import {
  isBucket,
  isCleanupReason,
  isGateRule,
  isUsageTier,
  isVerdictKind,
  parseEnumParam,
  parsePositiveInt,
} from '../filterVocabulary'
import { buildSearch, useUrlFilterSync } from './useUrlFilterSync'

/** "Every bucket" — VERIFIED, COMMUNITY and DELETE. */
export const ALL_BUCKETS = 'ALL'

/** Default bucket for the cleanup queue: "All". */
const DEFAULT_BUCKET: Bucket | typeof ALL_BUCKETS = ALL_BUCKETS

const DEFAULT_PAGE = 1

/**
 * Serialise the cleanup filter state into the canonical query string.
 * Written in one place so hydrate and write-back agree on key order and on
 * which values are omitted — the echo guard below compares these strings.
 */
/** Query keys this hook owns. Anything else in the URL is left untouched. */
const OWNED_KEYS = [
  'bucket',
  'reason',
  'tier',
  'verdict',
  'mcp',
  'category',
  'rule',
  'order_by',
  'q',
  'page',
] as const

const serialize = (
  c: {
    bucket: string
    reason: string | null
    tier: string | null
    verdict: string | null
    mcp: string | null
    category: string | null
    rule: string | null
    order_by: string | null
    query: string
    page: number
  },
  /** Current URL, so params owned by other features survive the write-back. */
  current: string,
  /** `undefined` leaves the `assistant` param alone; `null` removes it. */
  assistantId: string | null | undefined
): string => {
  const next = buildSearch(current, OWNED_KEYS, {
    // Only written when it differs from the default, so a pristine cleanup
    // queue has a clean URL. ALL ("all buckets") is a real selection and is
    // written — omitting it would silently mean the DELETE default.
    bucket: c.bucket !== DEFAULT_BUCKET && c.bucket,
    reason: c.reason,
    tier: c.tier,
    verdict: c.verdict,
    mcp: c.mcp,
    category: c.category,
    rule: c.rule,
    order_by: c.order_by,
    q: c.query,
    page: c.page > DEFAULT_PAGE && String(c.page),
  })
  if (assistantId === undefined) return next
  const params = new URLSearchParams(next)
  if (assistantId) params.set('assistant', assistantId)
  else params.delete('assistant')
  return params.toString()
}

/**
 * Makes the URL the single source of truth for the cleanup queue's filters.
 *
 * Two rules keep this honest, and both were violated by the previous
 * implementation:
 *
 * 1. **Hydration is a full replace, never a merge.** Every known key is
 *    written on every hydrate — its default when the param is absent.
 *    Previously hydration was `if (param) set(param)` with no `else`, and
 *    because the store is a module-level singleton that nothing resets, an
 *    absent param meant "keep whatever the last visit left behind". Filters
 *    the admin could not see silently narrowed the table, and were then
 *    written back into the URL.
 *
 * 2. **Hydration reacts to every URL change, not just mount.** Browser
 *    Back/Forward and in-app links that change only the query string (the
 *    Overview KPI cards) now drive the table. Previously an `initializedRef`
 *    disabled the URL→store direction after mount while the store→URL
 *    write-back stayed live, so such a navigation was ignored and then
 *    reverted.
 *
 * The store→URL write is synchronous, not debounced (a debounce here just
 * widens the race below; free-text search already debounces upstream in
 * `MarketplaceCleanupFilters`). But react-router wraps `navigate()` in
 * `React.startTransition`, so `useSearchParams()` can still lag a call by
 * tens of milliseconds. The Cleanup page used to write `?assistant=` with
 * its own independent `setSearchParams`, rebuilt from whatever `searchParams`
 * it last rendered with — inside that lag window that snapshot could be
 * missing a just-applied filter, silently dropping it when the drawer wrote.
 *
 * Fix: single writer. This hook is the only caller of `setSearchParams` for
 * the cleanup queue; every write recomputes the full query string from fresh
 * inputs (the store snapshot, plus `assistantId`), never by echoing a
 * possibly-stale URL read. One writer with fresh inputs can't race itself.
 *
 * `useUrlFilterSync` holds the echo guard (the last query string read or
 * written), so the two directions can't ping-pong.
 *
 * @param assistantId The drawer's open assistant id, or `null` when closed.
 */
export const useMarketplaceFilters = (assistantId?: string | null): void => {
  const [searchParams] = useSearchParams()
  const { cleanup } = useSnapshot(marketplaceManagementStore)
  const { acceptUrl, write } = useUrlFilterSync()

  const search = searchParams.toString()

  // --- URL → store: full replace, on every URL change ----------------------
  useEffect(() => {
    if (!acceptUrl(search)) return

    const params = new URLSearchParams(search)
    const rawBucket = params.get('bucket')

    let bucket: Bucket | typeof ALL_BUCKETS
    if (rawBucket === null) {
      bucket = DEFAULT_BUCKET
    } else if (rawBucket === '' || rawBucket.toUpperCase() === ALL_BUCKETS) {
      // Both spellings mean "all buckets" and normalise to the one we emit, so
      // an old link and a new one put the store into the same state.
      bucket = ALL_BUCKETS
    } else if (isBucket(rawBucket)) {
      bucket = rawBucket
    } else {
      bucket = DEFAULT_BUCKET
    }

    const { cleanup: state } = marketplaceManagementStore
    state.bucket = bucket
    // Screened for the same reason `bucket` is: an unknown value is a 422.
    state.reason = parseEnumParam(params.get('reason'), isCleanupReason)
    state.tier = parseEnumParam(params.get('tier'), isUsageTier)
    state.verdict = parseEnumParam(params.get('verdict'), isVerdictKind)
    state.mcp = params.get('mcp')
    state.category = params.get('category')
    state.rule = parseEnumParam(params.get('rule'), isGateRule)
    state.order_by = params.get('order_by')
    state.query = params.get('q') ?? ''
    state.page = parsePositiveInt(params.get('page'), DEFAULT_PAGE)
  }, [search, acceptUrl])

  // --- store → URL: synchronous, echo-guarded -------------------------------
  useEffect(() => {
    const next = serialize(
      {
        bucket: cleanup.bucket,
        reason: cleanup.reason,
        tier: cleanup.tier,
        verdict: cleanup.verdict,
        mcp: cleanup.mcp,
        category: cleanup.category,
        rule: cleanup.rule,
        order_by: cleanup.order_by,
        query: cleanup.query,
        page: cleanup.page,
      },
      search,
      assistantId
    )
    // `replace` inside `write`, so a filter tweak does not push a history entry
    // per keystroke; hydration above is what makes Back/Forward correct.
    write(next)
  }, [
    cleanup.bucket,
    cleanup.reason,
    cleanup.tier,
    cleanup.verdict,
    cleanup.mcp,
    cleanup.category,
    cleanup.rule,
    cleanup.order_by,
    cleanup.query,
    cleanup.page,
    search,
    assistantId,
    write,
  ])
}
