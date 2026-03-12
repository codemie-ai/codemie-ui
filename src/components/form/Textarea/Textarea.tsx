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

import React, {
  forwardRef,
  ReactNode,
  TextareaHTMLAttributes,
  useImperativeHandle,
  useRef,
} from 'react'

import TooltipButton from '@/components/TooltipButton'
import { cn } from '@/utils/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  name?: string
  error?: string
  label?: string
  hint?: string
  id?: string
  readonly?: boolean
  sensitive?: boolean
  rootClass?: string
  value?: string
  children?: ReactNode
  headerContent?: ReactNode
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export interface TextareaRef {
  focus: () => void
  getCursor: () => number | undefined
  setCursor: (position: number) => void
}

const Textarea = forwardRef<TextareaRef, TextareaProps>(
  (
    {
      name,
      error,
      label,
      hint,
      id,
      readonly,
      sensitive,
      rootClass = '',
      value,
      headerContent,
      onChange,
      required,
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus()
      },
      getCursor: () => {
        return textareaRef.current?.selectionStart
      },
      setCursor: (position: number) => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(position, position)
          textareaRef.current.focus()
        }
      },
    }))

    return (
      <div className={cn('flex flex-col gap-2  w-full relative', rootClass)}>
        {(label || headerContent) && (
          <div className="flex items-center justify-between">
            {label && (
              <label htmlFor={id} className="flex items-center text-xs text-text-quaternary">
                {label} {required && <span className="text-text-error ml-0.5">*</span>}
                {hint && <TooltipButton className="ml-2" content={hint} />}
              </label>
            )}

            {headerContent}
          </div>
        )}

        <textarea
          id={id}
          ref={textareaRef}
          name={name}
          value={value}
          onChange={onChange}
          className={cn(
            'rounded-lg border border-border-primary p-2 py-2.5 px-3 max-h-96 min-h-12 text-sm transition',
            'bg-surface-base-content placeholder:text-text-specific-input-placeholder focus:outline-none !text-text-primary show-scroll w-auto',
            error && 'border-border-error',
            !error && 'focus:border-border-secondary hover:border-border-secondary',
            className,
            disabled && 'bg-surface-base-chat !text-text-secondary hover:border-border-primary'
          )}
          readOnly={readonly}
          autoComplete={sensitive ? 'off' : undefined}
          required={required}
          style={{ scrollbarWidth: 'auto' }}
          disabled={disabled}
          {...rest}
        />

        {error && <div className="text-text-error text-sm">{error}</div>}
        {children}
      </div>
    )
  }
)

export default Textarea
