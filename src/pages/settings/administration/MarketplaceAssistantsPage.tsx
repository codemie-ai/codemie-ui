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

import { FC, ReactNode } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import Textarea from '@/components/form/Textarea/Textarea'
import Popup from '@/components/Popup'
import Table from '@/components/Table'
import { ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import type { PendingRow } from '@/types/generated/marketplaceManagement'

import {
  AssistantsEmptyState,
  COLUMN_DEFINITIONS,
  drawerWithdrawCopy,
  pendingWithdrawCopy,
} from './marketplaceManagement/assistants/assistantsConfig'
import { useAssistantsPage } from './marketplaceManagement/assistants/useAssistantsPage'
import AssistantDetailsDrawer from './marketplaceManagement/components/AssistantDetailsDrawer'
import MarketplaceAssistantsFilters from './marketplaceManagement/components/MarketplaceAssistantsFilters'
import MarketplacePendingBulkActions from './marketplaceManagement/components/MarketplacePendingBulkActions'
import TableLoadErrorBanner from './marketplaceManagement/components/TableLoadErrorBanner'
import { isReasonWithinBounds, reasonBoundHint } from './marketplaceManagement/reasonValidation'

const MarketplaceAssistantsPage: FC = () => {
  const {
    isLoading,
    loadError,
    items,
    effectivePagination,
    effectiveTotalCount,
    tableSelection,
    selected,
    clearSelection,
    setPagination,
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
    closeRowPopup,
    handleConfirmWithdraw,
    handlePopupSubmit,
    refresh,
    customRenderColumns,
    allSelectedPending,
  } = useAssistantsPage()

  let popupHeader = ''
  if (activePopup === 'reject') popupHeader = 'Reject assistant'
  else if (activePopup === 'forcePublish') popupHeader = 'Force-publish assistant'

  const popupPlaceholder =
    activePopup === 'reject'
      ? 'Enter rejection reason visible to the creator…'
      : 'Enter public override notice…'

  const popupSubmitLabel = activePopup === 'reject' ? 'Reject' : 'Force-publish'

  const emptyState: ReactNode = loadError ? undefined : (
    <AssistantsEmptyState searchTerm={filters.search} />
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* While rows are selected the bulk actions take the filter row's place */}
        {selected.length === 0 && (
          <MarketplaceAssistantsFilters filters={filters} onFilterChange={handleFilterChange} />
        )}

        {/* Bulk actions bar — only enabled for all-pending selections */}
        {selected.length > 0 &&
          (allSelectedPending ? (
            <MarketplacePendingBulkActions
              selectedItems={selected as unknown as PendingRow[]}
              onClearSelection={clearSelection}
              onRefresh={refresh}
            />
          ) : (
            <div
              data-testid="assistants-bulk-disabled-bar"
              className="inline-flex items-center py-1 px-3 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg text-xs text-text-secondary"
            >
              Bulk actions are available for Pending items only
            </div>
          ))}
      </div>

      {loadError && (
        <TableLoadErrorBanner
          testId="assistants-load-error"
          title="Failed to load assistants."
          detail={loadError}
          onRetry={refresh}
        />
      )}

      <div className="relative" data-testid="marketplace-assistants-table">
        <Table
          idPath="assistant_id"
          rowTestIdPrefix="marketplace-assistants-row"
          paginationTestId="assistants-pagination"
          emptyState={emptyState}
          {...tableSelection}
          items={items}
          selected={selected}
          columnDefinitions={COLUMN_DEFINITIONS}
          customRenderColumns={customRenderColumns}
          loading={isLoading}
          pagination={effectivePagination}
          onPaginationChange={(page, perPage) => {
            clearSelection()
            setPagination((prev) => {
              const resolvedPerPage = perPage ?? prev.perPage
              return {
                page,
                perPage: resolvedPerPage,
                totalPages: Math.ceil(effectiveTotalCount / resolvedPerPage),
                totalCount: effectiveTotalCount,
              }
            })
          }}
          perPageOptions={DECIMAL_PAGINATION_OPTIONS}
          tableClassName="table-fixed"
        />
      </div>

      {/* Row-level reject / force-publish popup */}
      <Popup
        visible={activePopup != null}
        onHide={closeRowPopup}
        header={popupHeader}
        submitText={popupSubmitLabel}
        onSubmit={handlePopupSubmit}
        submitDisabled={!isReasonWithinBounds(popupText) || isActionBusy}
        submitTestId="assistants-moderation-submit"
        submitButtonType={activePopup === 'reject' ? ButtonType.DELETE : ButtonType.PRIMARY}
        className="w-[480px]"
        withBorderBottom={false}
      >
        <div className="flex flex-col gap-4">
          <Textarea
            data-testid="assistants-reason-input"
            label={activePopup === 'reject' ? 'Reason' : 'Override notice'}
            placeholder={popupPlaceholder}
            value={popupText}
            onChange={(e) => setPopupText(e.target.value)}
            rows={4}
          />
          <p
            data-testid="assistants-reason-hint"
            className={
              isReasonWithinBounds(popupText) || popupText.length === 0
                ? 'text-xs text-text-tertiary'
                : 'text-xs text-failed-secondary'
            }
          >
            {reasonBoundHint(popupText, activePopup === 'reject' ? 'Reason' : 'Override notice')}
          </p>
        </div>
      </Popup>

      {/* Withdraw confirmation modal */}
      <ConfirmationModal
        confirmTestId="assistants-confirm-withdraw"
        cancelTestId="assistants-cancel-withdraw"
        visible={pendingWithdraw != null}
        onCancel={() => setPendingWithdraw(null)}
        onConfirm={handleConfirmWithdraw}
        confirmDisabled={isActionBusy}
        header={pendingWithdrawCopy(pendingWithdraw).header}
        message={`"${pendingWithdraw?.name}" will be removed from the marketplace.`}
        confirmText={pendingWithdrawCopy(pendingWithdraw).confirmText}
        confirmButtonType={ButtonType.DELETE}
      />

      {/* Assistant details drawer */}
      <AssistantDetailsDrawer
        assistantId={drawerAssistantId}
        withdrawCopy={drawerWithdrawCopy(drawerRow)}
        onClose={() => setDrawerAssistantId(null)}
        onActionSuccess={() => {
          setDrawerAssistantId(null)
          refresh()
        }}
      />
    </div>
  )
}

export default MarketplaceAssistantsPage
