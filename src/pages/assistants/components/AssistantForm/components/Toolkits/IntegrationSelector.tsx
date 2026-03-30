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

import PlusFilledSvg from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import Select from '@/components/form/Select'
import { Setting } from '@/types/entity/setting'
import { cn } from '@/utils/utils'

interface IntegrationSelectorProps {
  value?: Setting | null
  settingsDefinitions?: Setting[]
  addButtonLabel?: string
  label?: string
  placeholder?: string
  className?: string
  selectClassName?: string
  optionTruncateThreshold?: number
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'mouse'
  onChange: (value?: Setting) => void
  onAddSettingClick: () => void
  short?: boolean
  error?: string
}

const IntegrationSelector = ({
  value,
  settingsDefinitions,
  addButtonLabel,
  label,
  placeholder,
  optionTruncateThreshold = 16,
  className,
  selectClassName,
  tooltipPosition,
  onChange,
  onAddSettingClick,
  short: _short,
  error,
}: IntegrationSelectorProps) => {
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

  return (
    <div className={cn('flex flex-col w-full', className)}>
      {selectOptions && settingsDefinitions && settingsDefinitions.length > 0 ? (
        <Select
          showClear
          ref={selectRef}
          tooltipPosition={tooltipPosition}
          value={settingsDefinitions.find((o) => o.id === value?.id)?.id}
          options={selectOptions}
          optionTruncateThreshold={optionTruncateThreshold}
          label={label}
          placeholder={placeholder ?? 'Default integration'}
          rootClassName={cn('w-full max-w-[300px]', selectClassName)}
          panelClassName={'max-w-[300px]'}
          onChange={(e) => {
            const value = settingsDefinitions.find((s) => s.id === e.target.value)!
            onChange(value)
          }}
          error={error}
          panelFooterTemplate={
            <Button
              onClick={handleClick}
              variant="secondary"
              className="w-full rounded-t-sm rounded-b-none border-x-0 border-t-0 border-border-specific-panel-outline hover:border-border-specific-panel-outline"
            >
              <PlusFilledSvg />
              {buttonLabel}
            </Button>
          }
        />
      ) : (
        <>
          <Button variant="secondary" onClick={handleClick}>
            <PlusFilledSvg /> {buttonLabel}
          </Button>
          {error && <div className="text-failed-secondary text-sm mt-1">{error}</div>}
        </>
      )}
    </div>
  )
}

export default IntegrationSelector
