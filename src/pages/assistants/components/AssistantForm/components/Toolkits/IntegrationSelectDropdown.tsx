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

import { Dropdown } from 'primereact/dropdown'
import { useRef } from 'react'

import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import Select from '@/components/form/Select'
import { Setting } from '@/types/entity/setting'
import { cn } from '@/utils/utils'

export interface IntegrationSelectDropdownProps {
  isAutoMode: boolean
  value?: Setting | null
  settingsDefinitions?: Setting[]
  addButtonLabel?: string
  label?: string
  placeholder?: string
  className?: string
  selectClassName?: string
  buttonClassName?: string
  optionTruncateThreshold?: number
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'mouse'
  onChange: (value?: Setting) => void
  onAddSettingClick: () => void
  error?: string
}

export const IntegrationSelectDropdown = ({
  isAutoMode,
  value,
  settingsDefinitions: settingsDefinitionsProp,
  addButtonLabel,
  label,
  placeholder,
  optionTruncateThreshold = 16,
  className,
  selectClassName,
  buttonClassName,
  tooltipPosition,
  onChange,
  onAddSettingClick,
  error,
}: IntegrationSelectDropdownProps) => {
  const settingsDefinitions = settingsDefinitionsProp ?? []
  const selectRef = useRef<Dropdown>(null)

  const selectOptions = settingsDefinitions?.map((option) => ({
    label: `${option.alias} (${option.setting_type})`,
    value: option.id,
  }))

  const handleClick = () => {
    selectRef.current?.hide()
    onAddSettingClick()
  }

  const buttonLabel = addButtonLabel ?? 'Add User Integration'

  if (!selectOptions || !settingsDefinitions || settingsDefinitions.length === 0) {
    return (
      <div className={className}>
        <Button
          variant="secondary"
          onClick={handleClick}
          className={cn('ml-auto w-[180px]', buttonClassName)}
        >
          <PlusSvg /> {buttonLabel}
        </Button>
        {error && <div className="text-failed-secondary text-sm mt-1">{error}</div>}
      </div>
    )
  }

  if (isAutoMode) return null

  return (
    <div className={className}>
      <Select
        showClear
        ref={selectRef}
        tooltipPosition={tooltipPosition}
        value={settingsDefinitions.find((o) => o.id === value?.id)?.id}
        options={selectOptions}
        optionTruncateThreshold={optionTruncateThreshold}
        label={label}
        placeholder={placeholder ?? 'Select integration'}
        rootClassName={cn('w-full max-w-[300px]', selectClassName)}
        panelClassName={'max-w-[300px]'}
        onChange={(e) => {
          const selected = settingsDefinitions.find((s) => s.id === e.target.value)!
          onChange(selected)
        }}
        error={error}
        panelFooterTemplate={
          <Button
            onClick={handleClick}
            variant="secondary"
            className="w-full rounded-t-sm rounded-b-none border-x-0 border-t-0 border-border-specific-panel-outline hover:border-border-specific-panel-outline"
          >
            <PlusSvg />
            {buttonLabel}
          </Button>
        }
      />
    </div>
  )
}
