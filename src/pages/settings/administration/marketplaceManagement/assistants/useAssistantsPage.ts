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

import { MARKETPLACE_STATUS } from '@/constants/assistants'
import { useTableSelection } from '@/hooks/useTableSelection'
import type { AssistantRow } from '@/store/marketplaceManagement'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { Pagination } from '@/types/common'
import toaster from '@/utils/toaster'

import { useAssistantsFilters } from '../hooks/useAssistantsFilters'
import { isReasonWithinBounds } from '../reasonValidation'
import {
  makeActionsRenderer,
  makeNameRenderer,
  renderCategories,
  renderSubmittedAt,
  renderSubmittedBy,
  type ActivePopup,
} from './assistantsConfig'

import type { AssistantsFilters } from '../hooks/useAssistantsFilters'

export function useAssistantsPage() {
  const { assistants } = useSnapshot(marketplaceManagementStore)

  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 0,
    perPage: 20,
    totalPages: 0,
    totalCount: 0,
  })

  // Row-level action state
  const [activeRowId, setActiveRowId] = useState<string | null>(null)
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null)
  const [popupText, setPopupText] = useState('')
  const [isActionBusy, setIsActionBusy] = useState(false)

  // Withdraw confirmation
  const [pendingWithdraw, setPendingWithdraw] = useState<AssistantRow | null>(null)

  // Drawer
  const [drawerAssistantId, setDrawerAssistantId] = useState<string | null>(null)
  const drawerRow = assistants.items.find((a) => a.assistant_id === drawerAssistantId) ?? null

  // URL-persisted filters (status, category, waitTime, sortBy).
  const { filters, setFilters } = useAssistantsFilters()

  // ---------------------------------------------------------------------------
  // Client-side filtering (search, category, wait time, gate result)
  // ---------------------------------------------------------------------------

  const items = useMemo<AssistantRow[]>(() => {
    let list = [...assistants.items]

    if (filters.search) {
      const lower = filters.search.toLowerCase()
      list = list.filter(
        (r) =>
          (r.name ?? '').toLowerCase().includes(lower) ||
          (r.submitted_by ?? '').toLowerCase().includes(lower)
      )
    }

    if (filters.category) {
      list = list.filter((r) => (r.categories ?? []).includes(filters.category))
    }

    if (filters.waitTime) {
      const now = Date.now()
      list = list.filter((r) => {
        if (r.submitted_at == null) return false
        const age = now - r.submitted_at * 1000
        if (age < 0) return false
        let bucket: string
        if (age < 86_400_000) {
          bucket = 'lt_1d'
        } else if (age < 604_800_000) {
          bucket = '1_7d'
        } else if (age < 2_592_000_000) {
          bucket = '7_30d'
        } else {
          bucket = 'gt_30d'
        }
        return bucket === filters.waitTime
      })
    }

    // Client-side sort — this endpoint has no `order_by` param, unlike the
    // legacy /pending one. Rows with no submitted_at sort last either way.
    if (filters.sortBy === 'submitted_desc' || filters.sortBy === 'submitted_asc') {
      const dir = filters.sortBy === 'submitted_asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        if (a.submitted_at == null) return 1
        if (b.submitted_at == null) return -1
        return (a.submitted_at - b.submitted_at) * dir
      })
    } else if (filters.sortBy === 'name_asc') {
      list = [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    }

    return list
  }, [assistants.items, filters.search, filters.category, filters.waitTime, filters.sortBy])

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  // When client-side filters reduce the displayed set, pagination must reflect
  // the filtered count — not the server's raw total — so the page indicator
  // and onPaginationChange both compute the correct totalPages.
  const clientFiltersActive = !!(filters.search || filters.category || filters.waitTime)
  const effectiveTotalCount = clientFiltersActive ? items.length : pagination.totalCount
  const effectivePagination = clientFiltersActive
    ? {
        ...pagination,
        totalCount: effectiveTotalCount,
        totalPages: Math.ceil(effectiveTotalCount / (pagination.perPage || 20)),
      }
    : pagination

  // Slice the filtered list to the current page so the table only shows one
  // page at a time and "Select all" only covers what is on screen.
  const { page, perPage } = effectivePagination
  const pageItems = items.slice(page * perPage, (page + 1) * perPage)

  const tableSelection = useTableSelection<AssistantRow>({
    totalCount: pageItems.length,
    currentItems: pageItems,
  })

  const { selected, clearSelection } = tableSelection

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadPage = useCallback(async (statusFilter?: string) => {
    setIsLoading(true)
    setLoadError(null)
    try {
      await marketplaceManagementStore.loadAssistants(statusFilter)
      const snap = marketplaceManagementStore.assistants
      setPagination((prev) => {
        const perPage = prev.perPage || 20
        return {
          page: 0,
          perPage,
          totalPages: Math.ceil(snap.total / perPage),
          totalCount: snap.total,
        }
      })
    } catch (err) {
      const e = err as { parsedError?: { message?: string }; message?: string } | null
      setLoadError(e?.parsedError?.message ?? e?.message ?? 'Could not load assistants.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPage('PENDING')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = useCallback(() => {
    clearSelection()
    loadPage('PENDING')
    marketplaceManagementStore.loadOverview()
  }, [clearSelection, loadPage])

  // ---------------------------------------------------------------------------
  // Filter change handler
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (f: AssistantsFilters) => {
      clearSelection()
      setPagination((prev) => ({ ...prev, page: 0 }))
      setFilters(f)
    },
    [clearSelection, setFilters]
  )

  // ---------------------------------------------------------------------------
  // Row action handlers
  // ---------------------------------------------------------------------------

  const openRowPopup = useCallback((id: string, popup: ActivePopup) => {
    setActiveRowId(id)
    setPopupText('')
    setActivePopup(popup)
  }, [])

  const closeRowPopup = useCallback(() => {
    setActivePopup(null)
    setActiveRowId(null)
    setPopupText('')
  }, [])

  const handlePublishRow = useCallback(
    async (row: AssistantRow) => {
      if (isActionBusy) return
      setIsActionBusy(true)
      try {
        await marketplaceManagementStore.approve(row.assistant_id)
        toaster.success(`"${row.name}" published to the marketplace.`)
        refresh()
        marketplaceManagementStore.loadOverview()
      } catch {
        // api.handleError already raised a toast with the server's message.
      } finally {
        setIsActionBusy(false)
      }
    },
    [isActionBusy, refresh]
  )

  const handleWithdrawRow = useCallback((row: AssistantRow) => {
    setPendingWithdraw(row)
  }, [])

  const handleConfirmWithdraw = useCallback(async () => {
    if (!pendingWithdraw || isActionBusy) return
    const row = pendingWithdraw
    setIsActionBusy(true)
    try {
      await marketplaceManagementStore.withdraw(row.assistant_id)
      toaster.success(`"${row.name}" withdrawn.`)
      setPendingWithdraw(null)
      refresh()
      marketplaceManagementStore.loadOverview()
    } catch {
      setPendingWithdraw(null)
    } finally {
      setIsActionBusy(false)
    }
  }, [pendingWithdraw, isActionBusy, refresh])

  const handlePopupSubmit = useCallback(async () => {
    if (!activeRowId || !activePopup || !isReasonWithinBounds(popupText) || isActionBusy) return
    setIsActionBusy(true)
    try {
      if (activePopup === 'reject') {
        await marketplaceManagementStore.reject(activeRowId, popupText.trim())
        toaster.success('Assistant rejected.')
      } else if (activePopup === 'forcePublish') {
        await marketplaceManagementStore.forcePublish(activeRowId, popupText.trim())
        toaster.success('Assistant force-published.')
      }
      closeRowPopup()
      refresh()
      marketplaceManagementStore.loadOverview()
    } catch {
      // api.handleError already raised a toast.
    } finally {
      setIsActionBusy(false)
    }
  }, [activeRowId, activePopup, popupText, isActionBusy, closeRowPopup, refresh])

  // ---------------------------------------------------------------------------
  // Column renderers
  // ---------------------------------------------------------------------------

  const customRenderColumns = useMemo(
    () => ({
      name: makeNameRenderer(setDrawerAssistantId),
      submitted_by: renderSubmittedBy,
      submitted_at: renderSubmittedAt,
      categories: renderCategories,
      actions: makeActionsRenderer(handlePublishRow, handleWithdrawRow, openRowPopup),
    }),
    [handlePublishRow, handleWithdrawRow, openRowPopup, setDrawerAssistantId]
  )

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const allSelectedPending =
    selected.length > 0 &&
    selected.every((r) => r.marketplace_status === MARKETPLACE_STATUS.PENDING_REVIEW)

  return {
    isLoading,
    loadError,
    items: pageItems,
    pagination,
    setPagination,
    effectivePagination,
    effectiveTotalCount,
    tableSelection,
    selected,
    clearSelection,
    activeRowId,
    activePopup,
    popupText,
    setPopupText,
    isActionBusy,
    pendingWithdraw,
    setPendingWithdraw,
    drawerAssistantId,
    setDrawerAssistantId,
    drawerRow,
    filters,
    handleFilterChange,
    openRowPopup,
    closeRowPopup,
    handlePublishRow,
    handleWithdrawRow,
    handleConfirmWithdraw,
    handlePopupSubmit,
    refresh,
    customRenderColumns,
    allSelectedPending,
  }
}
