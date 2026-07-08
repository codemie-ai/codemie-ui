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

import React from 'react'
import { useSnapshot } from 'valtio'

import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import Select from '@/components/form/Select'
import { MCP_SETTINGS_TYPE_LABEL } from '@/constants/settings'
import { userStore } from '@/store'
import { User } from '@/types/entity/user'
import { isUserProjectAdmin } from '@/utils/user'
import { cn } from '@/utils/utils'

import { UserSetting } from '../types'

// Sentinel value for the "no explicit integration" option. PrimeReact's Dropdown can't match an
// empty string to an option (it renders the placeholder instead), so we use a non-empty value and
// map it back to null (base config) before it leaves this component.
const NO_INTEGRATION = '__none__'

interface IntegrationSelectorProps {
  className?: string
  itemKey: string
  project
  settingId: string | null
  credentialType: string
  originalToolName: string
  options: UserSetting[]
  onUpdate: (itemKey: string, settingId: string | null, setting: UserSetting | null) => void
  onAdd: (payload: { itemKey: string; settingType: string; originalToolName: string }) => void
}

export const IntegrationSelector: React.FC<IntegrationSelectorProps> = ({
  className,
  itemKey,
  project,
  settingId,
  credentialType,
  originalToolName,
  options,
  onUpdate,
  onAdd,
}) => {
  const { user } = useSnapshot(userStore)
  const isMcpSlot = credentialType === MCP_SETTINGS_TYPE_LABEL
  const handleAddClick = () => onAdd({ settingType: credentialType, originalToolName, itemKey })

  if (options.length === 0 && !isMcpSlot) {
    return (
      <Button variant="secondary" onClick={handleAddClick}>
        <PlusFilledSvg className="size-3.5" />
        Add Integration
      </Button>
    )
  }

  const selectOptions = options.map((option) => {
    const displayType =
      option.setting_type === 'project' && isUserProjectAdmin(user as User, project, true)
        ? option.project_name
        : option.setting_type
    const label = `${option.alias} (${displayType})`
    return { label, value: option.id }
  })

  // MCP slots expose two states: NO INTEGRATION (base config, no per-user creds) and EXPLICIT
  // INTEGRATION (a real integration). The DEFAULT state's semantics/storage are unchanged (still
  // saved as '' -> base config); only the label wording differs. Regular tool slots keep the single
  // "None" option. Both leading options use the NO_INTEGRATION sentinel as their value so the
  // control can render the selected label instead of the placeholder (see NO_INTEGRATION).
  const leadingOptions = isMcpSlot
    ? [{ label: 'No integration', value: NO_INTEGRATION }]
    : [{ label: 'None', value: NO_INTEGRATION }]

  const allOptions = [...leadingOptions, ...selectOptions]
  const selectedValue = settingId ?? NO_INTEGRATION
  const selectedOption = allOptions.find((opt) => opt.value === selectedValue) || null

  const handleChange = (value: string | null) => {
    // The NO_INTEGRATION sentinel (and any empty/nullish value) means DEFAULT: saved as '' -> base
    // config, no per-user creds. A real id means an explicit integration. Map the sentinel back to
    // null so the stored value and the backend contract stay unchanged.
    const newSettingId = value && value !== NO_INTEGRATION ? value : null
    const setting = newSettingId
      ? options.find((option) => option.id === newSettingId) || null
      : null
    onUpdate(itemKey, newSettingId, setting)
  }

  return (
    <div className={cn('flex items-start flex-col', className)}>
      <Select
        className="!w-52"
        placeholder="Default integration"
        value={selectedOption?.value}
        optionTruncateThreshold={16}
        options={allOptions}
        panelFooterTemplate={
          <Button
            variant="secondary"
            className="w-full rounded-b-none !border-transparent !border-b-border-specific-panel-outline"
            onClick={handleAddClick}
          >
            <PlusFilledSvg />
            Add Integration
          </Button>
        }
        onChangeValue={handleChange}
      />
    </div>
  )
}
