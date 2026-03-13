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

import { forwardRef, useRef, useEffect } from 'react'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import ActionDeleteSvg from '@/assets/icons/delete.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Input from '@/components/form/Input'
import TooltipButton from '@/components/TooltipButton'
import { cn } from '@/utils/utils'

import Button from '../../Button'

interface InputArrayProps {
  isAIGenerated: boolean
  name?: string
  error?: string
  itemErrors?: Array<string | undefined>
  label?: string
  hint?: string
  id?: string
  maxLength?: number
  value: string[]
  className?: string
  onChange?: (value: string[]) => void
}

const InputArray = forwardRef<HTMLInputElement, InputArrayProps>(
  (
    {
      isAIGenerated,
      name,
      error,
      itemErrors,
      label,
      hint,
      id,
      maxLength,
      value,
      className,
      onChange,
      ...rest
    },
    ref
  ) => {
    // Generate stable keys for array items
    const itemKeysRef = useRef<Map<number, string>>(new Map())
    const nextIdRef = useRef(0)

    // Ensure we have keys for all current items
    useEffect(() => {
      const currentKeys = new Map<number, string>()
      value.forEach((_, index) => {
        // Reuse existing key if available, otherwise generate new one
        const existingKey = itemKeysRef.current.get(index)
        if (existingKey) {
          currentKeys.set(index, existingKey)
        } else {
          const newKey = `item-${nextIdRef.current}`
          nextIdRef.current += 1
          currentKeys.set(index, newKey)
        }
      })
      itemKeysRef.current = currentKeys
    }, [value.length])

    const removeItem = (index: number) => {
      const newItems = [...value]
      newItems.splice(index, 1)
      onChange?.(newItems)
    }

    const addEmptyItem = () => {
      if (!maxLength || (maxLength && value.length < maxLength)) {
        const newItems = [...value, '']
        onChange?.(newItems)
      }
    }

    const handleItemChange = (index: number, newItemValue: string) => {
      const newItems = [...value]
      newItems[index] = newItemValue
      onChange?.(newItems)
    }

    const addButtonLabel = label ? `Add ${label.toLowerCase().replace(/s$/, '')}` : 'Add item'

    return (
      <div ref={ref} className={className}>
        <div className="flex items-end">
          {label && (
            <label htmlFor={id} className="text-xs text-text-quaternary flex items-center gap-2">
              {label}
              {hint && <TooltipButton content={hint} />}
            </label>
          )}
          <Button
            type="secondary"
            className="ml-auto"
            onClick={addEmptyItem}
            aria-label={addButtonLabel}
          >
            <PlusSvg /> Add
          </Button>
        </div>

        {value.map((item, index) => {
          const itemError = itemErrors?.[index]
          const itemKey = itemKeysRef.current.get(index) ?? `item-${index}`
          const itemAriaLabel = label
            ? `${label.replace(/s$/, '')} ${index + 1}`
            : `Item ${index + 1}`

          return (
            <div key={itemKey} className="mt-2">
              <div
                className={cn(
                  'flex rounded-lg border bg-surface-base-content transition min-h-8 max-h-8',
                  itemError
                    ? 'border-failed-secondary'
                    : 'border-border-primary hover:border-border-secondary focus-within:border-border-secondary'
                )}
              >
                <Input
                  fullWidth
                  value={item}
                  name={name}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  containerClass="!rounded-r-none !border-0 !bg-transparent"
                  rightIcon={isAIGenerated && <AIFieldSvg />}
                  aria-label={itemAriaLabel}
                  {...rest}
                />
                <button
                  type="button"
                  className="h-7 px-2 rounded-r-lg text-text-accent bg-button-secondary -bg hover:bg-button-surface-specific-secondary-button-hover border-l border-border-primary my-auto"
                  onClick={() => removeItem(index)}
                  aria-label="Delete"
                >
                  <ActionDeleteSvg className="w-4 h-4" />
                </button>
              </div>
              {itemError && <div className="mt-1 text-failed-secondary text-sm">{itemError}</div>}
            </div>
          )
        })}

        {error && <div className="mt-2 text-failed-secondary text-sm">{error}</div>}
      </div>
    )
  }
)

export default InputArray
