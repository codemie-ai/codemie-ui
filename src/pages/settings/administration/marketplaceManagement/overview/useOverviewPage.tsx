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

import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import { AUDIT_STATUS_SUCCEEDED, marketplaceManagementStore } from '@/store/marketplaceManagement'
import type { Bucket, FacetCountWithUsers } from '@/types/generated/marketplaceManagement'
import toaster from '@/utils/toaster'

import {
  FACET_COUNT_RENDERERS,
  GateItem,
  renderGateCount,
  renderGateRule,
  renderGateSeverity,
} from './OverviewCells'
import { checkLabel, CLEANUP_BASE } from './overviewColumns'
import { ALL_BUCKETS } from '../hooks/useMarketplaceFilters'

export function useOverviewPage() {
  const navigate = useNavigate()
  const { overview, isLoadingOverview, overviewLoadError, isAuditing } = useSnapshot(
    marketplaceManagementStore
  )
  // Shared, not local: an audit started on this tab must still read as
  // running after the admin visits Pending or Cleanup and comes back.
  const isRunningAudit = isAuditing

  // Re-runs the deterministic categorization (gate rules + usage tiers) on
  // every marketplace assistant. Fast when the dataset is small (<10 s for
  // ~300 records); the LLM assessment step stays on-demand from the drawer.
  const handleRunAudit = useCallback(async () => {
    if (marketplaceManagementStore.isAuditing) return
    try {
      // `runAudit()` already refreshes the overview and the facets once the
      // run finishes, so the KPI cards and gate hits are current when it
      // resolves. Repeating both here doubled the post-audit reads against
      // data that had just been fetched (F-62).
      await marketplaceManagementStore.runAudit()
      const { auditStatus, auditEsDocCount } = marketplaceManagementStore
      if (auditStatus != null && auditStatus !== AUDIT_STATUS_SUCCEEDED) {
        // A PARTIAL run completed but ran degraded — the similarity backend
        // was unavailable, so the verdicts cover only the documents it could
        // see. It reports `error: null`, so without this branch it was
        // announced with the same "up to date" wording as a full pass and the
        // admin acted on numbers that silently excluded most of the catalogue.
        const scope =
          auditEsDocCount != null
            ? ` Similarity ran against ${auditEsDocCount.toLocaleString()} indexed document(s) only.`
            : ''
        toaster.info(
          `Audit finished, but the run was partial (${auditStatus}).${scope} Some duplicate checks may be missing.`
        )
      } else {
        toaster.success('Audit finished. Assistant categories and quality checks are up to date.')
      }
    } catch (err) {
      console.error('Marketplace audit failed:', err)
      toaster.error('Could not finish the audit. Try again in a moment.')
    }
    // `isAuditing` is cleared by the store action's own `finally`.
  }, [])

  const handleBucketClick = useCallback(
    (bucket: Bucket) => {
      navigate(`${CLEANUP_BASE}?bucket=${bucket}`)
    },
    [navigate]
  )

  // ── Derived item arrays ──────────────────────────────────────────────────

  const cleanupReasonItems = useMemo(
    () =>
      overview?.cleanup_reasons
        ? Object.entries(overview.cleanup_reasons).map(([reason, count]) => ({
            reason,
            count: Number(count),
          }))
        : [],
    [overview]
  )

  const gateHitsItems = useMemo(
    () => (overview?.gate_hits?.per_rule ?? []) as GateItem[],
    [overview]
  )

  const mcpItems = useMemo<FacetCountWithUsers[]>(() => overview?.top_mcps ?? [], [overview])

  const categoryItems = useMemo<FacetCountWithUsers[]>(
    () => overview?.top_categories ?? [],
    [overview]
  )

  // ── Custom column renderers ──────────────────────────────────────────────

  const renderFilterAction = useCallback(
    (onClick: () => void, label: string) => (
      <button
        type="button"
        className="cursor-pointer whitespace-nowrap text-xs text-text-accent hover:text-text-accent-hover"
        onClick={onClick}
        aria-label={`Show ${label} in the cleanup queue`}
      >
        Filter →
      </button>
    ),
    []
  )

  const gateCustomRender = useMemo(
    () => ({
      rule: renderGateRule,
      severity: renderGateSeverity,
      count: renderGateCount,
      action: (item: GateItem) =>
        renderFilterAction(
          () =>
            navigate(`${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&rule=${encodeURIComponent(item.rule)}`),
          checkLabel(item.rule)
        ),
    }),
    [navigate, renderFilterAction]
  )

  const facetCountRenderers = FACET_COUNT_RENDERERS

  // MCP and Category share their count columns but filter on different
  // dimensions, so each gets its own action renderer.
  const mcpCustomRender = useMemo(
    () => ({
      ...facetCountRenderers,
      action: (item: FacetCountWithUsers) =>
        renderFilterAction(
          () =>
            navigate(`${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&mcp=${encodeURIComponent(item.value)}`),
          item.value
        ),
    }),
    [facetCountRenderers, navigate, renderFilterAction]
  )

  const categoryCustomRender = useMemo(
    () => ({
      ...facetCountRenderers,
      action: (item: FacetCountWithUsers) =>
        renderFilterAction(
          () =>
            navigate(
              `${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&category=${encodeURIComponent(item.value)}`
            ),
          item.value
        ),
    }),
    [facetCountRenderers, navigate, renderFilterAction]
  )

  // ── Row click handlers ───────────────────────────────────────────────────

  const handleMcpRowSelect = useCallback(
    (newSelected: FacetCountWithUsers[]) => {
      const item = newSelected[0]
      if (item)
        navigate(`${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&mcp=${encodeURIComponent(item.value)}`)
    },
    [navigate]
  )

  const handleGateRowSelect = useCallback(
    (newSelected: GateItem[]) => {
      const item = newSelected[0]
      if (item)
        navigate(`${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&rule=${encodeURIComponent(item.rule)}`)
    },
    [navigate]
  )

  const handleCategoryRowSelect = useCallback(
    (newSelected: FacetCountWithUsers[]) => {
      const item = newSelected[0]
      if (item)
        navigate(`${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&category=${encodeURIComponent(item.value)}`)
    },
    [navigate]
  )

  // Stable empty arrays (reference-stable so Table doesn't re-render)
  const emptyFacetSelection = useMemo<FacetCountWithUsers[]>(() => [], [])
  const emptyGateSelection = useMemo<GateItem[]>(() => [], [])

  return {
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
  }
}
