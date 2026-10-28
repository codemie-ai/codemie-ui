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
import { useSearchParams } from 'react-router'
import { useSnapshot } from 'valtio'

import { useTableFilters } from '@/hooks/useTableFilters'
import { useTableSelection } from '@/hooks/useTableSelection'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { CleanupRow } from '@/types/generated/marketplaceManagement'
import toaster from '@/utils/toaster'

import { computeOrderBy, FIRST_SORT_ASC, sortStateFromOrderBy } from './cleanupSortHelpers'
import { ALL_BUCKETS, useMarketplaceFilters } from '../hooks/useMarketplaceFilters'

import type { ActiveFilterKind } from '../components/ActiveFiltersStrip'
import type { CleanupFilterState } from '../components/MarketplaceCleanupFilters'

export function useCleanupPage() {
  // Open assistant lives in the URL, but writing it is funnelled through
  // useMarketplaceFilters (see its docstring): undefined = defer to the URL,
  // a string/null = an open/close intent, rendered optimistically below.
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null | undefined>(undefined)

  // Sync URL params with the store cleanup filters (and the open assistant).
  useMarketplaceFilters(pendingAssistantId)

  const snap = useSnapshot(marketplaceManagementStore)
  const { cleanup, facets } = snap

  // Derive the filter DTO directly from the store snapshot so it stays in
  // lockstep with URL-driven hydration (useMarketplaceFilters writes into
  // the store; this memo makes those writes visible to the filter bar
  // immediately). The previous local useState was initialised once from a
  // stale snapshot and never re-synced, which made the Bucket/MCP
  // dropdowns lag behind the URL.
  const filters = useMemo<CleanupFilterState>(
    () => ({
      query: cleanup.query ?? '',
      // Preserve the empty-string bucket ("all") explicitly — falling back
      // to ALL_BUCKETS via `||` would replace an intentional "show every
      // bucket" state whenever the URL sets bucket= (e.g. after clicking
      // a facet row on the Overview).
      bucket: cleanup.bucket == null ? ALL_BUCKETS : (cleanup.bucket as string),
      reason: cleanup.reason ?? null,
      tier: cleanup.tier ?? null,
      verdict: cleanup.verdict ?? null,
      mcp: cleanup.mcp ?? null,
      category: cleanup.category ?? null,
    }),
    [
      cleanup.query,
      cleanup.bucket,
      cleanup.reason,
      cleanup.tier,
      cleanup.verdict,
      cleanup.mcp,
      cleanup.category,
    ]
  )

  // Read-only — writes go through pendingAssistantId, the single writer.
  const [searchParams] = useSearchParams()
  const urlAssistantId = searchParams.get('assistant')
  // Optimistic until the URL catches up with the pending intent (avoids a
  // visible delay opening/closing the drawer).
  const selectedAssistantId = pendingAssistantId !== undefined ? pendingAssistantId : urlAssistantId

  // Drop the override once the URL reflects it, so Back/Forward resumes
  // driving `assistant` directly.
  useEffect(() => {
    if (pendingAssistantId !== undefined && pendingAssistantId === urlAssistantId) {
      setPendingAssistantId(undefined)
    }
  }, [pendingAssistantId, urlAssistantId])

  const setSelectedAssistantId = useCallback((id: string | null) => {
    setPendingAssistantId(id)
  }, [])

  const { items } = cleanup
  const { total } = cleanup
  const { page } = cleanup
  const { pageSize } = cleanup

  const pagination = useMemo(
    () => ({
      page: page - 1, // Table uses 0-based pages
      perPage: pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalCount: total,
    }),
    [page, pageSize, total]
  )

  // Row selection for the bulk unpublish action. `totalCount` is the page's
  // row count, not the server total: "select all" must never claim rows that
  // are not on screen, because the bulk action then acts on assistants the
  // admin never looked at.
  const tableSelection = useTableSelection<CleanupRow>({
    totalCount: items.length,
    currentItems: items,
  })
  const { selected, clearSelection } = tableSelection

  // Sort state is controlled by the store's order_by so Back/Forward and
  // "Clear all" update the arrows without any local useState<SortState>.
  const { sort, onSort } = useTableFilters({
    sort: sortStateFromOrderBy(snap.cleanup.order_by),
    firstOrderByKey: (key) => (FIRST_SORT_ASC.has(key) ? 'asc' : 'desc'),
    onSortCallback: (newSort) => {
      marketplaceManagementStore.cleanup.order_by = computeOrderBy(newSort) ?? null
      marketplaceManagementStore.cleanup.page = 1
      clearSelection()
    },
  })

  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [isBulkBusy, setIsBulkBusy] = useState(false)

  // Single-row unpublish, reached from the row's "…" menu. Mirrors bulk
  // unpublish (same confirm-then-withdraw shape) but acts on one assistant,
  // so an admin does not have to select a row just to remove it.
  const [rowPendingUnpublish, setRowPendingUnpublish] = useState<CleanupRow | null>(null)
  const [isRowUnpublishBusy, setIsRowUnpublishBusy] = useState(false)

  const handleBulkUnpublish = useCallback(async () => {
    if (isBulkBusy) return
    setIsBulkBusy(true)
    try {
      const ids = selected.map((r) => r.id)
      const bucketById = Object.fromEntries(selected.map((r) => [r.id, r.bucket]))
      const result = await marketplaceManagementStore.withdrawBulk(ids, bucketById)
      const failedCount = result?.failed?.length ?? 0
      if (failedCount > 0) {
        toaster.success(`${result.unpublished} assistant(s) unpublished from the marketplace.`)
        toaster.error(
          `${failedCount} assistant(s) could not be unpublished. Please retry or check their status.`
        )
      } else {
        toaster.success(`${ids.length} assistant(s) unpublished from the marketplace.`)
      }
      setIsBulkConfirmOpen(false)
      clearSelection()
      marketplaceManagementStore.loadCleanup()
    } catch (err) {
      const message =
        (err as { parsedError?: { message?: string }; message?: string })?.parsedError?.message ??
        (err as { message?: string })?.message ??
        'Please try again.'
      toaster.error(`Failed to unpublish: ${message}`)
    } finally {
      setIsBulkBusy(false)
    }
  }, [isBulkBusy, selected, clearSelection])

  const handleRowUnpublishConfirm = useCallback(async () => {
    if (!rowPendingUnpublish || isRowUnpublishBusy) return
    setIsRowUnpublishBusy(true)
    try {
      await marketplaceManagementStore.withdraw(rowPendingUnpublish.id, rowPendingUnpublish.bucket)
      toaster.success(`"${rowPendingUnpublish.name}" unpublished from the marketplace.`)
      setRowPendingUnpublish(null)
      marketplaceManagementStore.loadCleanup()
    } catch (err) {
      const message =
        (err as { parsedError?: { message?: string }; message?: string })?.parsedError?.message ??
        (err as { message?: string })?.message ??
        'Please try again.'
      toaster.error(`Failed to unpublish: ${message}`)
    } finally {
      setIsRowUnpublishBusy(false)
    }
  }, [rowPendingUnpublish, isRowUnpublishBusy])

  const applyFiltersToStore = useCallback(
    (f: CleanupFilterState) => {
      marketplaceManagementStore.cleanup.query = f.query
      marketplaceManagementStore.setCleanupBucket(f.bucket)
      marketplaceManagementStore.setCleanupMcp(f.mcp)
      marketplaceManagementStore.setCleanupCategory(f.category)
      marketplaceManagementStore.cleanup.reason = f.reason
      marketplaceManagementStore.cleanup.tier = f.tier
      marketplaceManagementStore.cleanup.verdict = f.verdict
      marketplaceManagementStore.cleanup.page = 1
      clearSelection()
      // The store field-watcher useEffect above will re-fetch — no explicit
      // loadCleanup() call here (would cause a double-fetch).
    },
    [clearSelection]
  )

  const handleApplyFilters = useCallback(
    (f: CleanupFilterState) => {
      applyFiltersToStore(f)
    },
    [applyFiltersToStore]
  )

  const handleClearFilters = useCallback(() => {
    // resetCleanupFilters() clears order_by; the controlled sort in
    // useTableFilters picks up the change and resets the column arrows.
    marketplaceManagementStore.resetCleanupFilters()
    clearSelection()
  }, [clearSelection])

  const handleClearSingleFilter = useCallback(
    (kind: ActiveFilterKind) => {
      const { cleanup: state } = marketplaceManagementStore
      if (kind === 'mcp') marketplaceManagementStore.setCleanupMcp(null)
      else if (kind === 'category') marketplaceManagementStore.setCleanupCategory(null)
      else if (kind === 'reason') {
        state.reason = null
        state.page = 1
      } else if (kind === 'tier') {
        state.tier = null
        state.page = 1
      } else if (kind === 'verdict') {
        state.verdict = null
        state.page = 1
      } else if (kind === 'rule') {
        state.rule = null
        state.page = 1
      }
      clearSelection()
    },
    [clearSelection]
  )

  // Load facets and audit config once on mount.
  useEffect(() => {
    marketplaceManagementStore.loadFacets()
    marketplaceManagementStore.loadAuditConfig(snap.entityKind)
  }, [])

  // Single fetch path: every dimension the request depends on — filters,
  // page and page size — is a dependency here, and nothing calls loadCleanup()
  // directly. Previously `handlePageChange` also called it while `pageSize`
  // was in this dependency list, so changing rows-per-page issued the same
  // request twice.
  useEffect(() => {
    marketplaceManagementStore.loadCleanup()
  }, [
    cleanup.bucket,
    cleanup.reason,
    cleanup.rule,
    cleanup.tier,
    cleanup.verdict,
    cleanup.mcp,
    cleanup.category,
    cleanup.order_by,
    cleanup.query,
    cleanup.page,
    cleanup.pageSize,
  ])

  const handlePageChange = useCallback(
    (newPage: number, newPerPage?: number) => {
      if (newPerPage != null && newPerPage !== marketplaceManagementStore.cleanup.pageSize) {
        // A different page size makes the current page index meaningless.
        marketplaceManagementStore.cleanup.pageSize = newPerPage
        marketplaceManagementStore.cleanup.page = 1
        clearSelection()
        return
      }
      marketplaceManagementStore.cleanup.page = newPage + 1 // Table 0-based → store 1-based
      clearSelection()
    },
    [clearSelection]
  )

  return {
    snap,
    cleanup,
    facets,
    filters,
    selectedAssistantId,
    setSelectedAssistantId,
    items,
    pagination,
    tableSelection,
    selected,
    clearSelection,
    sort,
    onSort,
    isBulkConfirmOpen,
    setIsBulkConfirmOpen,
    isBulkBusy,
    rowPendingUnpublish,
    setRowPendingUnpublish,
    isRowUnpublishBusy,
    handleBulkUnpublish,
    handleRowUnpublishConfirm,
    handleApplyFilters,
    handleClearFilters,
    handleClearSingleFilter,
    handlePageChange,
  }
}
