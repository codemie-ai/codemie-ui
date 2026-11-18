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

import React from 'react'

import { cn } from '@/utils/utils'

export type BadgeVariant = 'neutral' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none',
      {
        'bg-surface-base-secondary text-text-primary': variant === 'neutral',
        'bg-surface-specific-navigation-badge text-text-specific-navigation-badge':
          variant === 'accent',
      },
      className
    )}
  >
    {children}
  </span>
)

export default Badge
