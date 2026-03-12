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

import React, { ButtonHTMLAttributes, ReactNode } from 'react'

import { ButtonSize, ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type?: ButtonType | `${ButtonType}`
  variant?: ButtonType | `${ButtonType}`
  size?: ButtonSize | `${ButtonSize}`
  disabled?: boolean
  className?: string
  children?: ReactNode
  buttonType?: 'button' | 'submit' | 'reset'
  isLoading?: boolean
}

const Button: React.FC<ButtonProps> = ({
  type = 'primary',
  variant,
  size = 'medium',
  disabled = false,
  className = '',
  children,
  buttonType = 'button',
  isLoading = false,
  ...rest
}) => {
  const displayType = variant ?? type

  return (
    <button
      type={buttonType}
      disabled={disabled || isLoading}
      className={cn(
        // Base styling for all buttons
        'relative flex items-center justify-center font-medium',
        'transition whitespace-nowrap',
        'rounded-lg border',
        'button',

        // Type-specific styles
        {
          // Base type
          'text-text-primary bg-surface-base-secondary border-border-structural hover:bg-border-structural':
            displayType === ButtonType.BASE,

          // Primary type
          'bg-button-primary-bg hover:bg-button-primary-bg-hover text-text-accent':
            displayType === ButtonType.PRIMARY,

          // Action type
          'text-text-accent bg-action-accent-btn border-surface-specific-input-prefix ease-in-out hover:border-border-specific-button-secondary-hover hover:bg-action-accent-hover':
            displayType === ButtonType.ACTION,

          // Secondary type
          'bg-surface-base-secondary text-text-accent border-border-quaternary hover:bg-surface-specific-secondary-button-hover hover:border-border-tertiary':
            displayType === ButtonType.SECONDARY,

          // Delete type
          'border-failed-secondary text-failed-secondary bg-failed-secondary/10 hover:bg-failed-secondary/15 hover:border-border-error-hover':
            displayType === ButtonType.DELETE,

          // Tertiary type
          'bg-none border-none text-text-primary hover:bg-border-structural':
            displayType === ButtonType.TERTIARY,

          // Magical type
          'bg-magical-button border-border-specific-button-service text-text-inverse border-1 hover:brightness-110 transition-all duration-100':
            displayType === 'magical',

          // Size-specific styles
          'py-0.5 px-1.5 gap-1 items-center text-xs font-semibold leading-5 tracking-tight h-6':
            size === ButtonSize.SMALL,
          'py-0.5 px-2 gap-1.5 items-center text-xs font-semibold leading-6 tracking-tight h-7':
            size === ButtonSize.MEDIUM,
          'py-1.5 px-4 gap-2.5 items-center text-sm font-semibold leading-7 tracking-tight h-11':
            size === ButtonSize.LARGE,

          // Disabled state
          'cursor-not-allowed opacity-50': disabled,
          'cursor-wait': isLoading,
        },
        className
      )}
      {...rest}
    >
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%] animate-shimmer pointer-events-none" />
      )}
    </button>
  )
}

export default Button
