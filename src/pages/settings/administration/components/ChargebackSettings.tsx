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

import Switch from '@/components/form/Switch'
import { useProjectChargebackEnabled } from '@/hooks/useFeatureFlags'
import { ChargebackAttribution } from '@/types/entity/project'

export interface ChargebackSettingsValue {
  chargeback_enabled: boolean
  chargeback_attribution: ChargebackAttribution
}

export interface ChargebackSettingsProps {
  value: ChargebackSettingsValue
  /**
   * Whether the project has a cost center linked. The cost center itself is selected or
   * removed on the project edit form, not here — so "Attribute to a cost center" is disabled
   * (with a hint) until one is linked.
   */
  hasCostCenter: boolean
  /**
   * Whether the `features:costCenters` flag is on. When cost centers are disabled the concept
   * does not exist for this deployment, so the "Attribute to a cost center" toggle is hidden
   * entirely and spend can only be attributed to the project.
   */
  costCentersEnabled: boolean
  canEdit: boolean
  onChange: (value: ChargebackSettingsValue) => void
}

const ChargebackSettings: FC<ChargebackSettingsProps> = ({
  value,
  hasCostCenter,
  costCentersEnabled,
  canEdit,
  onChange,
}) => {
  const [isChargebackEnabled] = useProjectChargebackEnabled()

  if (!isChargebackEnabled) {
    return null
  }

  const { chargeback_enabled, chargeback_attribution } = value

  const handleToggle = (checked: boolean) => {
    onChange({
      chargeback_enabled: checked,
      chargeback_attribution: checked ? chargeback_attribution || 'project' : 'project',
    })
  }

  const handleAttribution = (useCostCenter: boolean) => {
    onChange({
      chargeback_enabled,
      chargeback_attribution: useCostCenter ? 'cost_center' : 'project',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Switch
        id="chargeback_enabled"
        label="Enable chargeback"
        hint="Attribute this project's spend for chargeback reporting."
        value={chargeback_enabled}
        disabled={!canEdit}
        onChange={(event) => handleToggle((event.target as HTMLInputElement).checked)}
      />

      {chargeback_enabled && costCentersEnabled && (
        <Switch
          id="chargeback_use_cost_center"
          label="Attribute to a cost center"
          hint={
            hasCostCenter
              ? "Charge this project's spend to its linked cost center instead of the project's own code."
              : 'Link a cost center to this project on the project edit form to enable this.'
          }
          value={chargeback_attribution === 'cost_center'}
          disabled={!canEdit || !hasCostCenter}
          onChange={(event) => handleAttribution((event.target as HTMLInputElement).checked)}
        />
      )}
    </div>
  )
}

export default ChargebackSettings
