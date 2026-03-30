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

import React, { ChangeEvent, forwardRef } from 'react'

import TooltipButton from '@/components/TooltipButton'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

interface SwitchProps {
  label: string
  labelClassName?: string
  value?: boolean
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  disabled?: boolean
  styledDisabled?: boolean
  id?: string
  className?: string
  hint?: string
  error?: string
}

/**
 * Switch component that wraps PrimeReact's InputSwitch
 * This component mimics the behavior of the Vue Switch component
 */
const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      label,
      value,
      onChange,
      onBlur,
      disabled = false,
      styledDisabled,
      id,
      labelClassName,
      className = '',
      hint,
      error,
      ...rest
    },
    ref
  ) => {
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
    }
    const { isDark } = useTheme()

    return (
      <div className="flex flex-col gap-1">
        <label
          className={cn(
            'flex items-center gap-4 cursor-pointer group relative',
            disabled && 'cursor-default',
            className
          )}
        >
          <input
            id={id}
            ref={ref}
            role="switch"
            type="checkbox"
            checked={value}
            onChange={handleChange}
            onBlur={onBlur}
            disabled={disabled}
            className={cn('sr-only', 'peer')}
            {...rest}
          />
          <span
            style={{ transform: value ? 'translateZ(0)' : 'none' }}
            className={cn(
              // General
              'switch',
              'flex items-center relative flex-shrink-0',
              'transition-colors duration-100 ease-in-out',

              // Container
              'h-[var(--switch-size)] basis-[var(--switch-container-width)] rounded-[var(--switch-size)]',
              'border bg-origin-border border-border-primary peer-checked:border-border-accent',
              'bg-gradient-switch-off peer-checked:bg-gradient-switch-on',
              `${isDark ? 'border-0' : ''}`,

              // Error state
              error && '!border-failed-secondary peer-checked:!border-failed-secondary',

              // Circle
              "before:content-[''] before:absolute before:left-[2px]",
              'before:h-[calc(var(--switch-size)_-_6px)] before:w-[calc(var(--switch-size)_-_6px)] before:rounded-full',
              'before:transition-transform before:duration-150 before:ease-in-out',
              'peer-checked:before:translate-x-[calc(var(--switch-container-width)_-_var(--switch-size))]',
              'before:bg-surface-specific-circle-passive peer-checked:before:bg-surface-specific-circle-active',

              styledDisabled && disabled && 'transition opacity-65'
            )}
          ></span>
          <span className="flex items-center gap-1">
            <span
              className={cn(
                'text-xs text-text-tertiary group-hover:text-border-accent group-has-[*:focus-visible]:text-border-accent transition',
                styledDisabled &&
                  disabled &&
                  'opacity-65 group-hover:text-text-tertiary group-has-[*:focus-visible]:text-text-tertiary',
                labelClassName
              )}
            >
              {label}
            </span>
            {hint && <TooltipButton content={hint} className="ml-1" />}
          </span>
        </label>
        {error && <p className="text-sm text-failed-secondary mt-1">{error}</p>}
      </div>
    )
  }
)

export default Switch
