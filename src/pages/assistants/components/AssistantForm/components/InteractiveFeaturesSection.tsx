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

import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'
import { catalogElementLabels } from '@/components/InteractiveElements/registry'
import type { InteractiveFeaturesConfig } from '@/types/entity/interactive'

// A single toggle enables ALL interactive element types at once — every feature
// flag on. (The config keeps its granular shape for the backend/API, but the UI
// no longer exposes per-feature switches.)
const ALL_ENABLED: InteractiveFeaturesConfig = {
  action_buttons: true,
  choice: true,
  short_forms: true,
}

// The full catalog of interactive elements, derived from the element registry (single
// source of truth) so adding an element type updates this list automatically.
const ELEMENTS = catalogElementLabels()

interface InteractiveFeaturesSectionProps {
  value: InteractiveFeaturesConfig | null | undefined
  onChange: (value: InteractiveFeaturesConfig | null) => void
  onBlur: () => void
}

/**
 * "Interactive features" assistant config block. A single switch turns the whole
 * interactive-element catalog on or off; when off the elements are removed from
 * the catalog exposed to the agent server-side, not merely hidden.
 */
const InteractiveFeaturesSection: FC<InteractiveFeaturesSectionProps> = ({
  value,
  onChange,
  onBlur,
}) => {
  const isEnabled = value !== null && value !== undefined

  return (
    <>
      <Switch
        label="Enable interactive features"
        value={isEnabled}
        onChange={(e) => onChange(e.target.checked ? { ...ALL_ENABLED } : null)}
        onBlur={onBlur}
      />
      {isEnabled && (
        <InfoBox>
          The assistant can request structured input directly in chat using: {ELEMENTS.join(', ')}.
          When disabled, these elements are removed from the catalog exposed to the agent, not just
          hidden.
        </InfoBox>
      )}
    </>
  )
}

export default InteractiveFeaturesSection
