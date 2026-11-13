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

import { normalizeModelName } from '@/store/cliAnalytics'
import type { CostMetadata } from '@/types/cliAnalytics'

export interface CostState {
  incomplete: boolean
  unpricedModels: string[]
}

// An answer flagged incomplete without naming a model still has to be marked.
const UNNAMED_MODELS = 'some models'

export const getCostState = (meta?: CostMetadata | null): CostState => {
  const names = meta?.unpriced_models ?? []
  const incomplete = meta?.cost_incomplete === true || names.length > 0
  return { incomplete, unpricedModels: names.length || !incomplete ? names : [UNNAMED_MODELS] }
}

// The API gives no priced/unpriced split of a total, so a flagged selection whose total is 0 is read
// as "nothing was priced". A priced part that is a real $0 next to unpriced models is shown as unknown
// too: the full cost is unknown either way.
export const isCostUnknown = (cost: number | null | undefined, state: CostState): boolean =>
  state.incomplete && !cost

export const isModelUnpriced = (modelName: string, state: CostState): boolean => {
  const name = normalizeModelName(modelName)
  return state.unpricedModels.some((model) => normalizeModelName(model) === name)
}
