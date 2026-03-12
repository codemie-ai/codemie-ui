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
import { userStore } from '@/store'
import { User } from '@/types/entity/user'
import { isUserProjectAdmin } from '@/utils/user'
import { cn } from '@/utils/utils'

import { UserSetting } from '../types'

interface IntegrationSelectorProps {
  className?: string
  itemKey: string
  project
  settingId: string | null
  credentialType: string
  originalToolName: string
  options: UserSetting[]
  onUpdate: (itemKey: string, value: UserSetting | null) => void
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
  const handleAddClick = () => onAdd({ settingType: credentialType, originalToolName, itemKey })

  if (options.length === 0) {
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

  const selectedOption = selectOptions.find((opt) => opt.value === settingId) || null

  return (
    <div className={cn('flex items-start flex-col', className)}>
      <Select
        className="!w-52"
        placeholder="Default integration"
        value={selectedOption?.value}
        optionTruncateThreshold={16}
        options={[{ label: 'None', value: '' }, ...selectOptions]}
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
        onChange={(e) => onUpdate(itemKey, options.find((option) => option.id === e.target.value)!)}
      />
    </div>
  )
}
