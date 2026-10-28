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

import { FC } from 'react'

import Table from '@/components/Table'
import MarketplaceKpiRow from '@/pages/settings/administration/marketplaceManagement/components/MarketplaceKpiRow'
import TableLoadErrorBanner from '@/pages/settings/administration/marketplaceManagement/components/TableLoadErrorBanner'
import { marketplaceManagementStore } from '@/store/marketplaceManagement'

import {
  REASON_CUSTOM_RENDER,
  type GateItem,
  type ReasonItem,
} from './marketplaceManagement/overview/OverviewCells'
import {
  CATEGORY_COLUMNS,
  GATE_COLUMNS,
  MCP_COLUMNS,
  REASON_COLUMNS,
} from './marketplaceManagement/overview/overviewColumns'
import {
  DiagnosticKpi,
  EmptyState,
  OverviewExplainer,
} from './marketplaceManagement/overview/OverviewSubComponents'
import { useOverviewPage } from './marketplaceManagement/overview/useOverviewPage'

// Re-exported for tests that import them directly from this module path.
export { CHECK_LABEL, GATE_COLUMNS } from './marketplaceManagement/overview/overviewColumns'

const MarketplaceOverviewPage: FC = () => {
  const {
    overview,
    isLoadingOverview,
    overviewLoadError,
    isRunningAudit,
    handleRunAudit,
    handleBucketClick,
    cleanupReasonItems,
    gateHitsItems,
    mcpItems,
    categoryItems,
    gateCustomRender,
    mcpCustomRender,
    categoryCustomRender,
    handleMcpRowSelect,
    handleGateRowSelect,
    handleCategoryRowSelect,
    emptyFacetSelection,
    emptyGateSelection,
  } = useOverviewPage()

  const reasonCustomRender = REASON_CUSTOM_RENDER

  return (
    <div className="flex flex-col gap-6">
      {/* Shared-audit freshness banner. Multiple admins see the same
              cached result — this shows when it was last computed and
              (when there has never been an audit) prompts the first admin
              to click Run audit. Prevents each admin's first page load
              from silently kicking off a run that takes minutes. */}
      {overview && overview.has_ever_run === false && (
        <output
          data-testid="mm-no-audit-banner"
          className="flex items-center justify-between rounded-md border border-in-progress-primary/40 bg-in-progress-primary/10 px-3 py-2 text-xs text-in-progress-primary"
        >
          <span>
            <span className="font-semibold">No audit has been run yet.</span> Choose{' '}
            <span className="font-semibold">Run audit</span> to sort every marketplace assistant
            into Qualified, Community or Delete. The result is shared with all admins — it only
            needs to be run once after assistants change.
          </span>
        </output>
      )}
      {overview && overview.has_ever_run && overview.last_run_at && (
        <div
          data-testid="mm-audit-freshness"
          className="flex items-center gap-2 text-[11px] text-text-tertiary"
        >
          <span>
            Last audit:{' '}
            <span className="text-text-secondary">
              {/* Individual component options, NOT dateStyle/timeStyle:
                      ECMA-402 forbids combining those with timeZoneName and
                      throws `TypeError: Invalid option : option`, which took
                      the whole Overview page down. The timezone matters here
                      because the audit result is shared between admins in
                      different regions. */}
              {new Date(overview.last_run_at).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </span>
          </span>
          <span>·</span>
          <span>Results are shared across all admins.</span>
        </div>
      )}

      {/* Workflow explainer + admin trigger */}
      <OverviewExplainer isRunningAudit={isRunningAudit} onRunAudit={handleRunAudit} />

      {/* Inline overview-load error banner — parallel to the same
              pattern on the Cleanup page. Any previously-loaded KPIs
              remain visible while the retry surfaces. */}
      {overviewLoadError && (
        <TableLoadErrorBanner
          testId="overview-load-error"
          title="Couldn't load the overview."
          detail="Check your connection and try again."
          onRetry={() => marketplaceManagementStore.loadOverview()}
        />
      )}

      {/* (a) KPI row — bucket cards */}
      {/* `isLoading` keeps the cards from showing a confident "0" for
              every bucket while the payload is still in flight — an admin
              could otherwise read an unloaded page as an empty marketplace.
              The same reasoning applies once the fetch has *failed* with
              nothing cached: "0 assistants" on a failed load reads as an empty
              marketplace, which was the originally reported bug, and it would
              also make the error state indistinguishable from a genuinely
              empty one (spec §2.9d). The banner above is the message; where
              earlier numbers exist they are kept, because stale data an admin
              can recognise beats zeros they cannot. */}
      {!(overviewLoadError && !overview) && (
        <MarketplaceKpiRow
          isLoading={isLoadingOverview && !overview}
          buckets={overview?.buckets ?? { VERIFIED: 0, COMMUNITY: 0, DELETE: 0 }}
          bucketUsage={overview?.bucket_usage ?? { VERIFIED: 0, COMMUNITY: 0, DELETE: 0 }}
          onCardClick={handleBucketClick}
        />
      )}

      {/* (b) Diagnostics strip */}
      <div className="flex flex-wrap gap-3">
        <DiagnosticKpi label="Total Marketplace Assistants" value={overview?.total} />
        <DiagnosticKpi label="Pending review" value={overview?.pending?.count} />
        <DiagnosticKpi label="Waiting > 7 days" value={overview?.pending?.waiting_over_7d} />
        <DiagnosticKpi
          label="Failing a critical check"
          value={overview?.gate_hits?.critical}
          valueClassName="text-failed-secondary"
        />
        <DiagnosticKpi
          label="Failing a minor check"
          value={overview?.gate_hits?.optional}
          valueClassName="text-aborted-primary"
        />
      </div>

      {/* (c) Two-column split: cleanup reasons | gate hits */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border-structural p-4">
          <h3 className="text-sm font-semibold text-text-primary">Assistants flagged, by reason</h3>
          {cleanupReasonItems.length === 0 && !isLoadingOverview ? (
            <EmptyState
              message="No cleanup reasons yet."
              hint="Run the audit to populate this table."
            />
          ) : (
            <Table<ReasonItem>
              idPath="reason"
              items={cleanupReasonItems}
              columnDefinitions={REASON_COLUMNS}
              customRenderColumns={reasonCustomRender}
              loading={isLoadingOverview}
              embedded
            />
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border-structural p-4">
          <h3 className="text-sm font-semibold text-text-primary">Failed quality checks</h3>
          {gateHitsItems.length === 0 && !isLoadingOverview ? (
            <EmptyState message="No failed checks." hint="Run the audit to populate this table." />
          ) : (
            <Table<GateItem>
              idPath="rule"
              items={gateHitsItems}
              columnDefinitions={GATE_COLUMNS}
              customRenderColumns={gateCustomRender}
              loading={isLoadingOverview}
              selected={emptyGateSelection}
              onSelectRow={handleGateRowSelect}
              embedded
            />
          )}
        </div>
      </div>

      {/* (d) Two-column split: MCPs | categories */}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <div
          className="flex flex-col gap-2 rounded-lg border border-border-structural p-4"
          data-testid="top-mcps-section"
        >
          <h3 className="text-sm font-semibold text-text-primary">Most-used MCP servers</h3>
          {mcpItems.length === 0 && !isLoadingOverview ? (
            <EmptyState
              message="No assistant uses an MCP server."
              hint="This is normal if your assistants rely only on built-in tools."
            />
          ) : (
            <Table
              idPath="value"
              items={mcpItems}
              columnDefinitions={MCP_COLUMNS}
              customRenderColumns={mcpCustomRender}
              loading={isLoadingOverview}
              embedded
              tableClassName="table-fixed"
              selected={emptyFacetSelection}
              onSelectRow={handleMcpRowSelect}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-border-structural p-4">
          <h3 className="text-sm font-semibold text-text-primary">Most-used categories</h3>
          {categoryItems.length === 0 && !isLoadingOverview ? (
            <EmptyState
              message="No categories assigned yet."
              hint="Categories are chosen by assistant owners. Manage the available list under Administration → Categories."
            />
          ) : (
            <Table
              idPath="value"
              items={categoryItems}
              columnDefinitions={CATEGORY_COLUMNS}
              customRenderColumns={categoryCustomRender}
              loading={isLoadingOverview}
              embedded
              tableClassName="table-fixed"
              selected={emptyFacetSelection}
              onSelectRow={handleCategoryRowSelect}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default MarketplaceOverviewPage
