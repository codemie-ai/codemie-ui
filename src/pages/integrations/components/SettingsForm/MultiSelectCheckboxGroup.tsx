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

import React, { useEffect, useState } from 'react'

import { Checkbox } from '@/components/form/Checkbox'

const DEFAULT_EMPTY_SELECTION_ERROR = 'At least one option must stay selected.'

type MultiSelectOption = { value: string | number | boolean; label: string }

// An option's `value` may bundle multiple raw stored tokens as a comma-separated
// string (e.g. "approved,unapproved" for one checkbox) — normalize to individual
// tokens for storage/comparison, never compare the option's raw `value` as one string.
const optionTokens = (option: MultiSelectOption) =>
  String(option.value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

type MultiSelectCheckboxGroupProps = {
  name: string
  label?: string
  options?: MultiSelectOption[]
  value: string | null | undefined
  error?: string
  emptySelectionError?: string
  // Bump on every external form reset so the transient empty-selection message
  // clears even when the reset re-applies a string-equal value.
  resetKey?: React.Key
  onChange: (value: string) => void
}

const MultiSelectCheckboxGroup: React.FC<MultiSelectCheckboxGroupProps> = ({
  name,
  label,
  options = [],
  value,
  error,
  emptySelectionError = DEFAULT_EMPTY_SELECTION_ERROR,
  resetKey,
  onChange,
}) => {
  const [blocked, setBlocked] = useState(false)

  // toggleOption manages `blocked` itself; any external value change clears it.
  // A reset back to a string-equal value skips the value dependency, so parents
  // that call reset() must bump `resetKey` to clear a stale message.
  useEffect(() => {
    setBlocked(false)
  }, [value, resetKey])

  const allTokens = options.flatMap(optionTokens)
  const selected =
    value === undefined || value === null || value === ''
      ? allTokens
      : value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)

  const toggleOption = (option: MultiSelectOption, checked: boolean) => {
    const tokens = optionTokens(option)
    const next = checked
      ? [...new Set([...selected, ...tokens])]
      : selected.filter((entry) => !tokens.includes(entry))

    if (next.length === 0) {
      setBlocked(true)
      return
    }

    setBlocked(false)
    onChange(next.join(','))
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-xs text-text-quaternary">{label}</span>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 border border-border-secondary rounded-lg p-3">
        {options.map((option) => (
          <Checkbox
            key={String(option.value)}
            id={`${name}-${option.value}`}
            label={option.label}
            checked={optionTokens(option).every((token) => selected.includes(token))}
            onChange={(checked) => toggleOption(option, checked)}
          />
        ))}
      </div>
      {blocked && <span className="text-xs text-text-error">{emptySelectionError}</span>}
      {error && <span className="text-xs text-text-error">{error}</span>}
    </div>
  )
}

export default MultiSelectCheckboxGroup
