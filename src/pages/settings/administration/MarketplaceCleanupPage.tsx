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

import { FC, useMemo } from 'react'

import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Table from '@/components/Table'
import BulkActions from '@/components/Table/BulkActions'
import { ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { formatLabelSentenceCase } from '@/utils/formatLabel'

import {
  makeCleanupAssistantRenderer,
  makeCleanupOpenRenderer,
  makeCleanupTierRenderer,
  renderCleanupBucket,
  renderCleanupCreator,
  renderCleanupDecision,
  renderCleanupLikes,
  renderCleanupUsers,
} from './marketplaceManagement/cleanup/CleanupCells'
import {
  COLUMN_DEFINITIONS,
  getColumnTooltips,
  HeaderWithInfo,
} from './marketplaceManagement/cleanup/cleanupColumns'
import { useCleanupPage } from './marketplaceManagement/cleanup/useCleanupPage'
import ActiveFiltersStrip from './marketplaceManagement/components/ActiveFiltersStrip'
import AssistantDetailsDrawer from './marketplaceManagement/components/AssistantDetailsDrawer'
import MarketplaceCleanupFilters from './marketplaceManagement/components/MarketplaceCleanupFilters'
import { verdictKindLabel } from './marketplaceManagement/components/ReasonChip'
import TableLoadErrorBanner from './marketplaceManagement/components/TableLoadErrorBanner'

// Re-exported for tests that import them directly from this module path.
export { COL_TO_BACKEND, computeOrderBy } from './marketplaceManagement/cleanup/cleanupSortHelpers'
export { getColumnTooltips } from './marketplaceManagement/cleanup/cleanupColumns'

const MarketplaceCleanupPage: FC = () => {
  const {
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
  } = useCleanupPage()

  // Column definitions with live-config header tooltips. Re-computed only when
  // auditConfig changes so the Tier/Bucket/Audit-rule/Decision headers always
  // show threshold values from the current audit run.
  const columnDefinitions = useMemo(() => {
    const tooltips = getColumnTooltips(snap.auditConfig)
    return COLUMN_DEFINITIONS.map((col) => {
      if (col.key === 'tier')
        return { ...col, label: <HeaderWithInfo label="Tier" tooltip={tooltips.tier} /> }
      if (col.key === 'bucket')
        return { ...col, label: <HeaderWithInfo label="Bucket" tooltip={tooltips.bucket} /> }
      if (col.key === 'decision')
        return {
          ...col,
          label: (
            <HeaderWithInfo
              label="Decision"
              tooltip={tooltips.decision}
              className="justify-between"
            />
          ),
        }
      return col
    })
  }, [snap.auditConfig])

  const customRenderColumns = useMemo(
    () => ({
      assistant: makeCleanupAssistantRenderer(setSelectedAssistantId),
      creator: renderCleanupCreator,
      users: renderCleanupUsers,
      likes: renderCleanupLikes,
      tier: makeCleanupTierRenderer(snap.auditConfig),
      bucket: renderCleanupBucket,
      decision: renderCleanupDecision,
      open: makeCleanupOpenRenderer(setSelectedAssistantId, setRowPendingUnpublish),
    }),
    // snap.auditConfig drives the tier chip tooltip content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap.auditConfig, setSelectedAssistantId, setRowPendingUnpublish]
  )

  const hasStructuralFilter =
    filters.mcp != null ||
    filters.category != null ||
    filters.reason != null ||
    filters.tier != null ||
    filters.verdict != null ||
    cleanup.rule != null

  return (
    <div className="flex h-full flex-col">
      {/* Active structural filters strip. `onClearAll` is deliberately not
          passed: the filter bar below already renders a labelled "Clear all",
          and showing both put two identical controls on screen at once. */}
      {hasStructuralFilter && (
        <div className="mb-5 mt-1">
          <ActiveFiltersStrip
            mcp={filters.mcp}
            category={filters.category}
            reason={filters.reason}
            tier={filters.tier}
            verdictLabel={filters.verdict ? verdictKindLabel(filters.verdict) : null}
            ruleLabel={cleanup.rule ? formatLabelSentenceCase(cleanup.rule) : null}
            onClear={handleClearSingleFilter}
          />
        </div>
      )}

      {/* Filter bar + bulk actions row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MarketplaceCleanupFilters
          filters={filters}
          facets={facets}
          cleanupReasons={snap.overview?.cleanup_reasons ?? null}
          hasRuleFilter={cleanup.rule != null}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        {selected.length > 0 && (
          <div data-testid="cleanup-bulk-actions">
            <BulkActions selected={selected.length} onUnselect={clearSelection}>
              <Button
                size="medium"
                variant="secondary"
                data-testid="cleanup-bulk-unpublish"
                onClick={() => setIsBulkConfirmOpen(true)}
                disabled={isBulkBusy}
              >
                Unpublish selected
              </Button>
            </BulkActions>
          </div>
        )}
      </div>

      {/* Inline load-failure banner — shown when the /cleanup fetch
              rejects (typically a 5xx). Any previously-loaded rows are
              preserved so the admin can still act on stale data if they
              choose to. */}
      {cleanup.loadError && (
        <TableLoadErrorBanner
          testId="cleanup-load-error"
          title="Failed to load cleanup queue."
          detail={cleanup.loadError}
          onRetry={() => marketplaceManagementStore.loadCleanup()}
        />
      )}

      {/* Data table */}
      <div className="relative mt-2" data-testid="cleanup-table">
        <Table
          rowTestIdPrefix="cleanup-row"
          paginationTestId="cleanup-pagination"
          // Same reasoning as the pending queue: "empty" needs a marker of its
          // own so it is distinguishable from a failed load (§2.9), and it is
          // withheld while the load-error banner above is the message.
          emptyState={
            cleanup.loadError ? undefined : (
              <span data-testid="cleanup-empty-state">
                No assistants match these cleanup filters.
              </span>
            )
          }
          // The API returns `id` on every verdict row (assistant_id is a
          // legacy alias absent from the response). Selecting on the
          // absent field made every row match on `undefined === undefined`
          // — one click flagged the whole table as selected.
          idPath="id"
          {...tableSelection}
          items={items}
          selected={selected}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={snap.isLoadingCleanup}
          pagination={pagination}
          onPaginationChange={handlePageChange}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          tableClassName="table-fixed"
          sort={sort}
          onSort={onSort}
        />
      </div>

      {/* Unpublishing is externally visible — it removes assistants from every
          user's marketplace — so it is confirmed, like every other destructive
          action in this app. */}
      <ConfirmationModal
        visible={isBulkConfirmOpen}
        onCancel={() => setIsBulkConfirmOpen(false)}
        onConfirm={handleBulkUnpublish}
        confirmDisabled={isBulkBusy}
        header={`Unpublish ${selected.length} assistant(s)?`}
        message="They will be removed from the marketplace listing and the search index, and returned to their creators. This does not delete them."
        confirmText="Unpublish"
        confirmButtonType={ButtonType.DELETE}
        hideIcon
      />

      {/* Single-row unpublish, reached from the row's "…" menu. Same
          destructive-confirm treatment as the bulk action above. */}
      <ConfirmationModal
        visible={rowPendingUnpublish != null}
        onCancel={() => setRowPendingUnpublish(null)}
        onConfirm={handleRowUnpublishConfirm}
        confirmDisabled={isRowUnpublishBusy}
        header={`Unpublish "${rowPendingUnpublish?.name ?? ''}"?`}
        message="It will be removed from the marketplace listing and the search index, and returned to its creator. This does not delete it."
        confirmText="Unpublish"
        confirmButtonType={ButtonType.DELETE}
        hideIcon
      />

      {/* Assistant details drawer */}
      <AssistantDetailsDrawer
        assistantId={selectedAssistantId}
        bucket={items.find((i) => i.id === selectedAssistantId)?.bucket ?? null}
        isCleanupQueue
        auditConfig={snap.auditConfig}
        onClose={() => setSelectedAssistantId(null)}
        onActionSuccess={() => marketplaceManagementStore.loadCleanup()}
        withdrawCopy={{
          buttonLabel: 'Unpublish',
          confirmHeader: 'Unpublish this assistant?',
          confirmMessage:
            'It will be removed from the marketplace listing and the search index, and returned to its creator. This does not delete it.',
          confirmButtonText: 'Unpublish',
          successMessage: 'Assistant unpublished from the marketplace.',
        }}
      />
    </div>
  )
}

export default MarketplaceCleanupPage
