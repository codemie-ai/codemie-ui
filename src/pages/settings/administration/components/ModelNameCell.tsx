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

import { MODEL_CHIP_CLASS } from '@/components/ModelCapabilityChips'
import PremiumModelBadge from '@/components/PremiumModelBadge'
import { AdminModel } from '@/types/entity/adminModel'

interface ModelNameCellProps {
  model: AdminModel
  isDirty: boolean
}

const ModelNameCell = ({ model, isDirty }: ModelNameCellProps) => (
  <div className="flex items-center justify-between gap-3 min-w-0">
    <div className="flex flex-col gap-1 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <span className="text-text-primary font-medium truncate min-w-0">{model.label}</span>
        {model.isPremium && <PremiumModelBadge />}
        {model.modelType === 'embedding' && <span className={MODEL_CHIP_CLASS}>Embedding</span>}
      </span>
      <span className="text-xs text-text-quaternary font-geist-mono">{model.base_name}</span>
    </div>
    {isDirty && (
      <svg
        className="size-2 shrink-0 text-in-progress-primary"
        viewBox="0 0 8 8"
        aria-label="Unsaved change"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Unsaved change"
      >
        <title>Unsaved change</title>
        <circle cx="4" cy="4" r="4" fill="currentColor" />
      </svg>
    )}
  </div>
)

export default ModelNameCell
