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
  // Current decision, owned by the caller. Passing it keeps the toggle in sync with stored data;
  // without it the component falls back to deriving the mode from `value`.
  autoMode?: boolean
  showAutoCredentials?: boolean
  short?: boolean
  error?: string
  disabled?: boolean
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
  autoMode,
  showAutoCredentials = false,
  short: _short,
  error,
  disabled,
}: IntegrationSelectorProps) => {
  const [derivedAutoMode, setDerivedAutoMode] = useState(!value)
  // When the caller owns the decision, follow it; otherwise keep the legacy behaviour of deriving
  // the mode from whether an integration is selected.
  const isAutoMode = autoMode ?? derivedAutoMode

  useEffect(() => {
    if (autoMode !== undefined) return
    const nextAuto = !value
    setDerivedAutoMode(nextAuto)
    onAutoModeChange?.(nextAuto)
  }, [value, autoMode])

  const handleToggle = (auto: boolean) => {
    setDerivedAutoMode(auto)
    onAutoModeChange?.(auto)
    // A caller that persists the decision clears the integration within the same update. Calling
    // onChange as well would rebuild the toolkit list from a stale snapshot and revert the flag that
    // was just stored, which is how a slot ended up saved with lookup off.
    if (auto && !onAutoModeChange) onChange(undefined)
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {/* The toggle decides whether credentials are looked up per consuming user, so the author's
          own list of integrations must not gate it: with no integration of that type the author
          still needs to say "each user brings their own". */}
      {showAutoCredentials && (
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
        disabled={disabled}
      />
    </div>
  )
}

export default IntegrationSelector
