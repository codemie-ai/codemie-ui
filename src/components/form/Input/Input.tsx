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

import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react'

import Hint from '@/components/Hint'
import TooltipButton from '@/components/TooltipButton'
import { cn } from '@/utils/utils'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value'> {
  name?: string
  error?: string
  label?: string
  sideLabel?: string
  hint?: string
  id?: string
  rootClass?: string
  inputClass?: string
  containerClass?: string
  errorClassName?: string
  disabled?: boolean
  sensitive?: boolean
  value?: string | number | readonly string[] | null
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  fullWidth?: boolean
  required?: boolean
  filled?: boolean
  labelContent?: ReactNode
  isFilterInput?: boolean
  orientation?: 'vertical' | 'horizontal'
  /** Regex for stripping disallowed characters from input value before onChange is called.
   *  Note: mutates e.target.value before passing the event to onChange. */
  keyfilter?: RegExp
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      name,
      error,
      label,
      sideLabel,
      hint,
      id,
      rootClass = '',
      inputClass = '',
      containerClass,
      errorClassName,
      disabled,
      sensitive,
      value,
      onChange,
      required,
      leftIcon,
      rightIcon,
      className,
      fullWidth,
      filled,
      isFilterInput = false,
      children,
      labelContent,
      orientation,
      keyfilter,
      ...rest
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (keyfilter) e.target.value = e.target.value.replace(keyfilter, '')
      onChange?.(e)
    }
    return (
      <label
        htmlFor={id}
        className={cn('flex flex-col gap-y-2 w-full min-w-0 input-field-wrapper', rootClass)}
      >
        <div
          className={cn(
            'flex flex-col gap-2 justify-between',
            orientation === 'horizontal' && 'flex-row'
          )}
        >
          {label && (
            <div className="flex justify-between">
              <div className="flex items-center gap-x-1 input-label-container">
                <div className="flex text-xs text-text-quaternary input-label">
                  {label}
                  {required && (
                    <span className="text-text-error input-label-required ml-0.5">*</span>
                  )}
                </div>
                {hint && <TooltipButton className="ml-1" content={hint} />}
              </div>
              {labelContent}
            </div>
          )}

          <div
            className={cn(
              'flex rounded-lg min-h-8 max-h-8 border bg-surface-base-content input-block-container transition',
              error && 'border-failed-secondary input-block-error',
              !error &&
                'border-border-primary hover:border-border-secondary focus-within:border-border-secondary',
              disabled && 'hover:border-border-primary opacity-60',
              filled && 'bg-border-primary',
              containerClass
            )}
          >
            {sideLabel && (
              <div className="text-xs flex items-center px-2 rounded-l-lg bg-surface-specific-input-prefix outline-1 outline outline-border-subtle">
                {sideLabel}
              </div>
            )}
            <div
              className={cn(
                'relative w-full text-text-primary',
                isFilterInput && 'border-border-structural rounded-lg',
                fullWidth && 'w-full',
                filled && 'w-full',
                leftIcon && 'pl-[30px]',
                rightIcon && 'pr-[30px]',
                className,
                sideLabel && 'rounded-l-none'
              )}
            >
              {leftIcon && (
                <div className="absolute top-[50%] left-[8px] transform -translate-y-1/2">
                  {leftIcon}
                </div>
              )}
              <input
                id={id}
                ref={ref}
                name={name}
                value={value ?? ''}
                onChange={handleChange}
                autoComplete={sensitive ? 'off' : undefined}
                data-testid="validation"
                disabled={disabled}
                required={required}
                className={cn(
                  'grow h-full bg-transparent text-sm text-text-primary outline-none input-element py-[9px] w-full placeholder:text-text-specific-input-placeholder',
                  isFilterInput ? 'px-1 rounded-lg' : 'p-2',
                  inputClass
                )}
                {...rest}
              />
              {children}
              {rightIcon && (
                <div className="absolute top-[50%] right-[8px] transform -translate-y-1/2">
                  {rightIcon}
                </div>
              )}
              {!label && hint && (
                <span className="flex items-center input-hint-icon">
                  <Hint hint={hint} />
                </span>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div className={cn('text-sm text-failed-secondary input-error-message', errorClassName)}>
            {error}
          </div>
        )}
      </label>
    )
  }
)

export default Input
