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

import { useEffect, useState } from 'react'

import { Setting } from '@/types/entity/setting'
import { cn } from '@/utils/utils'

import { AutoCredentialsSwitch } from './AutoCredentialsSwitch'
import { IntegrationSelectDropdown } from './IntegrationSelectDropdown'

interface IntegrationSelectorProps {
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
  onAutoModeChange?: (isAuto: boolean) => void
  showAutoCredentials?: boolean
  short?: boolean
  error?: string
}

const IntegrationSelector = ({
  value,
  settingsDefinitions,
  addButtonLabel,
  label,
  placeholder,
  optionTruncateThreshold,
  className,
  selectClassName,
  buttonClassName,
  tooltipPosition,
  onChange,
  onAddSettingClick,
  onAutoModeChange,
  showAutoCredentials = false,
  short: _short,
  error,
}: IntegrationSelectorProps) => {
  const [isAutoMode, setIsAutoMode] = useState(!value)

  useEffect(() => {
    const nextAuto = !value
    setIsAutoMode(nextAuto)
    onAutoModeChange?.(nextAuto)
  }, [value])

  const handleToggle = (auto: boolean) => {
    setIsAutoMode(auto)
    onAutoModeChange?.(auto)
    if (auto) onChange(undefined)
  }

  const hasOptions = (settingsDefinitions ?? []).length > 0

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {hasOptions && showAutoCredentials && (
        <AutoCredentialsSwitch isAutoMode={isAutoMode} onChange={handleToggle} />
      )}
      <IntegrationSelectDropdown
        isAutoMode={showAutoCredentials && isAutoMode}
        value={value}
        settingsDefinitions={settingsDefinitions}
        addButtonLabel={addButtonLabel}
        label={label}
        placeholder={placeholder}
        optionTruncateThreshold={optionTruncateThreshold}
        selectClassName={selectClassName}
        buttonClassName={buttonClassName}
        tooltipPosition={tooltipPosition}
        onChange={onChange}
        onAddSettingClick={onAddSettingClick}
        error={error}
      />
    </div>
  )
}

export default IntegrationSelector
