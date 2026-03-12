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

import React, { useEffect } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import { MASKED_VALUE } from '@/constants/settings'

import Button from '../../Button'
import TooltipButton from '../../TooltipButton'
import Input from '../Input'

interface RecordItem {
  key: string
  value: string
}

interface RecordInputProps {
  name: string
  value: RecordItem[]
  onChange: (items: RecordItem[]) => void
  error?: string
  label?: string
  hint?: string
  id?: string
  disabled?: boolean
  addText?: string
  sensitive?: boolean
  required?: boolean
}

const RecordInput: React.FC<RecordInputProps> = ({
  name,
  value,
  onChange,
  error,
  label,
  hint,
  id,
  disabled = false,
  addText = 'Add New Item',
  sensitive = false,
  required = false,
}) => {
  useEffect(() => {
    if (!value?.length) {
      onChange([{ key: '', value: '' }])
    }
  }, [value?.length])

  const addEmptyItem = () => {
    if (disabled) return
    onChange([...(value || []), { key: '', value: '' }])
  }

  const removeItem = (keyToRemove: string) => {
    const newItems = (value || []).filter((item) => item.key !== keyToRemove)
    onChange(newItems.length ? newItems : [{ key: '', value: '' }])
  }

  const updateKey = (newKey: string, index: number) => {
    const newItems = [...(value || [])]
    newItems[index] = { ...newItems[index], key: newKey }
    onChange(newItems)
  }

  const updateValue = (newValue: string, index: number) => {
    const newItems = [...(value || [])]
    newItems[index] = { ...newItems[index], value: newValue }
    onChange(newItems)
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        {label && (
          <label htmlFor={id} className="text-xs text-text-quaternary">
            {label}
            {required && <span className="text-text-error ml-0.5">*</span>}
            {hint && <TooltipButton className="ml-1" content={hint} />}
          </label>
        )}
        <Button type="secondary" className="mt-2" disabled={disabled} onClick={addEmptyItem}>
          {addText}
        </Button>
      </div>

      <div>
        <div className="grid grid-cols-[1fr_1fr_auto] mt-1 gap-x-3 gap-y-2">
          <div className="text-sm">Key</div>
          <div className="text-sm">Value</div>
          <div></div>
          {value?.map(({ key, value: itemValue }, index) => (
            <React.Fragment key={index}>
              <div
                title={
                  itemValue === MASKED_VALUE
                    ? "Encrypted key-values can't be modified - only replaced"
                    : undefined
                }
              >
                <Input
                  id={`${id}-key-${index}`}
                  name={name}
                  value={key}
                  disabled={disabled || itemValue === MASKED_VALUE}
                  placeholder="Key"
                  onChange={(e) => updateKey(e.target.value, index)}
                />
              </div>
              <Input
                id={`${id}-value-${index}`}
                name={name}
                value={itemValue}
                disabled={disabled}
                sensitive={sensitive}
                placeholder="Value"
                autoComplete={sensitive ? 'off' : undefined}
                onChange={(e) => updateValue(e.target.value, index)}
              />
              <Button
                type="secondary"
                className="!h-full"
                onClick={() => removeItem(key)}
                disabled={disabled}
              >
                <DeleteSvg />
              </Button>
            </React.Fragment>
          ))}
        </div>
      </div>
      {error && <div className="mt-2 text-text-error">{error}</div>}
    </div>
  )
}

export default RecordInput
