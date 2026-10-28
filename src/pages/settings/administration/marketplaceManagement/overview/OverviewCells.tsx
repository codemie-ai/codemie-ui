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

import { useNavigate } from 'react-router'

import ReasonChip from '@/pages/settings/administration/marketplaceManagement/components/ReasonChip'
import SeverityChip from '@/pages/settings/administration/marketplaceManagement/components/SeverityChip'
import type { FacetCountWithUsers } from '@/types/generated/marketplaceManagement'

import { checkLabel, CLEANUP_BASE } from './overviewColumns'
import { ALL_BUCKETS } from '../hooks/useMarketplaceFilters'

export type ReasonItem = { reason: string; count: number }
export type GateItem = { rule: string; severity: string; count: number }

const ReasonCell = ({ item }: { item: ReasonItem }) => <ReasonChip reason={item.reason} />

const ReasonCountCell = ({ item }: { item: ReasonItem }) => (
  <span className="text-xs font-medium tabular-nums">{item.count.toLocaleString()}</span>
)

const ReasonActionCell = ({ item }: { item: ReasonItem }) => {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="cursor-pointer whitespace-nowrap text-xs text-text-accent hover:text-text-accent-hover"
      // Explicit bucket= (all buckets) — a reason is a cleanup-cause
      // marker that can apply across buckets, so we should not silently
      // restrict to DELETE by keeping the default filter.
      // The cleanup filter's Reason options are lowercase snake_case
      // (`low_quality`, `policy_violation`). The overview payload keys
      // this dimension differently, so normalise at the link boundary —
      // otherwise the drill-down lands on a value the Reason select
      // cannot match and the table comes back empty.
      onClick={() =>
        navigate(
          `${CLEANUP_BASE}?bucket=${ALL_BUCKETS}&reason=${encodeURIComponent(
            item.reason.toLowerCase()
          )}`
        )
      }
    >
      Filter →
    </button>
  )
}

const GateRuleCell = ({ item }: { item: GateItem }) => (
  <span className="text-xs">{checkLabel(item.rule)}</span>
)

const GateSeverityCell = ({ item }: { item: GateItem }) => <SeverityChip severity={item.severity} />

const GateCountCell = ({ item }: { item: GateItem }) => (
  <span className="text-xs font-medium tabular-nums">{item.count.toLocaleString()}</span>
)

const FacetTotalUsersCell = ({ item }: { item: FacetCountWithUsers }) => (
  <span className="text-xs tabular-nums">{item.total_users.toLocaleString()}</span>
)

export const renderReasonItem = (item: ReasonItem) => <ReasonCell item={item} />
export const renderReasonCount = (item: ReasonItem) => <ReasonCountCell item={item} />
export const renderReasonAction = (item: ReasonItem) => <ReasonActionCell item={item} />

export const REASON_CUSTOM_RENDER = {
  reason: renderReasonItem,
  count: renderReasonCount,
  action: renderReasonAction,
}

export const renderGateRule = (item: GateItem) => <GateRuleCell item={item} />
export const renderGateSeverity = (item: GateItem) => <GateSeverityCell item={item} />
export const renderGateCount = (item: GateItem) => <GateCountCell item={item} />

export const renderFacetCount = (item: FacetCountWithUsers) => (
  <span className="text-xs tabular-nums">{item.count.toLocaleString()}</span>
)
export const renderFacetTotalUsers = (item: FacetCountWithUsers) => (
  <FacetTotalUsersCell item={item} />
)

export const FACET_COUNT_RENDERERS = {
  count: renderFacetCount,
  total_users: renderFacetTotalUsers,
}
