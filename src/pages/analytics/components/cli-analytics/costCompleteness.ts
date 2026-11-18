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

import type { CostMetadata, RowCostPricing } from '@/types/cliAnalytics'

export interface CostState {
  incomplete: boolean
  // An empty list uses a generic explanation.
  unpricedModels: string[]
  unknown?: boolean
}

const uniqueNames = (names: string[] = []): string[] => [
  ...new Set(names.map((name) => name.trim() || 'Unknown model')),
]

/** Selection-level state, from the response metadata: only for an amount that has no pricing of its own. */
export const getCostState = (meta?: CostMetadata | null): CostState => {
  const unpricedModels = uniqueNames(meta?.unpriced_models)
  return { incomplete: meta?.cost_incomplete === true || unpricedModels.length > 0, unpricedModels }
}

/** One amount's own state: unknown only when the API says nothing of it was priced (null is not evidence). */
export const getRowCostState = (
  pricing?: RowCostPricing | null
): CostState & { unknown: boolean } => {
  const unpricedModels = uniqueNames(pricing?.unpriced_models)
  const unknown = pricing?.cost_unknown === true
  return {
    incomplete: pricing?.cost_incomplete === true || unknown || unpricedModels.length > 0,
    unpricedModels,
    unknown,
  }
}

/** True when the rows carry per-amount pricing; false for an older backend (or no rows). */
export const hasRowPricing = (rows: RowCostPricing[]): boolean =>
  rows.some(
    (row) =>
      row.cost_incomplete !== undefined ||
      row.unpriced_models !== undefined ||
      row.cost_unknown !== undefined
  )

/** Prefer the KPI's own pricing; older responses only establish selection-level incompleteness. */
export const getKpiCostState = (
  kpis?: RowCostPricing | null,
  metadata?: CostMetadata | null
): CostState => (kpis && hasRowPricing([kpis]) ? getRowCostState(kpis) : getCostState(metadata))
