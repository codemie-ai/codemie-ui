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

import { Checkbox as PrimeCheckbox, CheckboxPassThroughOptions } from 'primereact/checkbox'
import { forwardRef, useId } from 'react'

import CheckedIcon from '@/assets/icons/check-18.svg?react'
import CheckboxMinusSvg from '@/assets/icons/checkbox-minus.svg?react'
import { cn } from '@/utils/utils'

import TooltipButton from '../TooltipButton'

type Props = {
  label?: string
  name?: string
  id?: string
  hint?: string
  checked?: boolean
  mixed?: boolean
  disabled?: boolean
  classNames?: string
  rootClassName?: string
  error?: string
  onChange: (checked: boolean) => void
}

export const Checkbox = forwardRef<HTMLInputElement, Props>(
  (
    {
      label,
      name,
      id,
      hint,
      checked = false,
      mixed = false,
      disabled = false,
      classNames,
      rootClassName,
      error,
      onChange,
    },
    ref
  ) => {
    const reactId = useId()
    const idKey = id ?? reactId

    const mixedIcon = mixed ? <CheckboxMinusSvg /> : null

    const handleChange = () => {
      if (disabled) return
      if (mixed) onChange(true)
      else onChange(!checked)
    }

    return (
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center gap-x-2">
          <div
            className={cn(
              'flex items-center group gap-x-2 text-text-primary transition',
              {
                'hover:text-border-accent': !disabled,
                'opacity-50 cursor-not-allowed': disabled,
              },
              rootClassName
            )}
          >
            <PrimeCheckbox
              name={name}
              inputId={idKey}
              pt={checkboxPT}
              checked={checked || mixed}
              disabled={disabled}
              className={classNames}
              icon={checked ? <CheckedIcon className="text-surface-base-primary" /> : mixedIcon}
              onChange={handleChange}
              inputRef={ref}
            />
            {!!label && (
              <label
                htmlFor={idKey}
                className={cn('text-sm ml-2 transition', {
                  'cursor-pointer hover:text-border-accent': !disabled && checked,
                  'cursor-not-allowed': disabled,
                })}
              >
                {label}
              </label>
            )}
          </div>
          {hint && <TooltipButton content={hint} />}
        </div>
        {error && <span className="text-xs text-text-error ml-6">{error}</span>}
      </div>
    )
  }
)

const checkboxPT: CheckboxPassThroughOptions = {
  root: {
    className: 'w-fit h-fit',
  },
  box: () => [
    'w-4 h-4 rounded-[4px] border transition-colors',
    '!group-hover:border-border-accent',
  ],
}
