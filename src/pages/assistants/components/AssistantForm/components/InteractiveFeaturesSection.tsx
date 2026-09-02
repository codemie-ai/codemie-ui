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

import { SUPPORTED_COMPONENTS } from '@/a2ui/config'
import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'

// Size of the rendered A2UI catalog, derived from the dependency-free component
// list (single source of truth, asserted against the registry by its own test)
// so adding a component updates the copy without pulling the A2UI runtime and
// every design-system icon into the assistant form bundle.
const CATALOG_SIZE = SUPPORTED_COMPONENTS.length

interface InteractiveFeaturesSectionProps {
  value: boolean | null | undefined
  onChange: (value: boolean) => void
  onBlur: () => void
}

/**
 * "Interactive features" assistant config block. A single switch turns the whole
 * A2UI component catalog on or off; when off the catalog is not exposed to the
 * agent server-side, so it cannot request interactive input at all.
 */
const InteractiveFeaturesSection: FC<InteractiveFeaturesSectionProps> = ({
  value,
  onChange,
  onBlur,
}) => {
  const isEnabled = Boolean(value)

  return (
    <>
      <Switch
        label="Enable interactive features"
        value={isEnabled}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
      />
      {isEnabled && (
        <InfoBox>
          The assistant can request structured input directly in chat by rendering an A2UI surface —
          text, inputs, choices, media and layout from the A2UI Basic Catalog ({CATALOG_SIZE}{' '}
          components). When disabled, the catalog is not exposed to the agent at all, so no
          interactive UI can be requested.
        </InfoBox>
      )}
    </>
  )
}

export default InteractiveFeaturesSection
