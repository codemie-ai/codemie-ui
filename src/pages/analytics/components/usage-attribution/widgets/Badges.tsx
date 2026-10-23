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

import { FC, ReactNode } from 'react'

import type { UaCategory, UaPayer } from '@/types/usageAttribution'
import { cn } from '@/utils/utils'

import { UA_CATEGORY_LABELS, UA_PAYER_LABELS } from '../constants'
import { useUaColors } from '../utils'

const pillClassName =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap'

/** Readable in both themes: the text keeps the text colour, and a dot carries the colour of the category or payer. */
const ColorPill: FC<{ color: string; children: ReactNode }> = ({ color, children }) => (
  <span
    className={cn(
      pillClassName,
      'gap-1.5 border border-border-specific-panel-outline bg-surface-elevated text-text-primary'
    )}
  >
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    {children}
  </span>
)

export const CategoryBadge: FC<{ category: UaCategory; suffix?: ReactNode }> = ({
  category,
  suffix,
}) => {
  const colors = useUaColors()
  return (
    <ColorPill color={colors.category(category)}>
      {UA_CATEGORY_LABELS[category] ?? category}
      {suffix}
    </ColorPill>
  )
}

export const PayPill: FC<{ payer: UaPayer }> = ({ payer }) => {
  const colors = useUaColors()
  return <ColorPill color={colors.payer(payer)}>{UA_PAYER_LABELS[payer]}</ColorPill>
}

/** A neutral pill: "Web Platform", "CLI", "Yours", "Defaults"… */
export const Pill: FC<{
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'warning' | 'success'
  className?: string
}> = ({ children, tone = 'neutral', className }) => (
  <span
    className={cn(
      pillClassName,
      {
        'bg-surface-elevated text-text-secondary border border-border-specific-panel-outline':
          tone === 'neutral',
        'bg-in-progress-tertiary text-in-progress-primary': tone === 'accent',
        'bg-aborted-tertiary text-aborted-primary': tone === 'warning',
        'bg-success-secondary text-success-primary': tone === 'success',
      },
      className
    )}
  >
    {children}
  </span>
)

/** A small colour square of legends. */
export const Swatch: FC<{ color: string; className?: string }> = ({ color, className }) => (
  <span
    className={cn('inline-block w-3 h-3 rounded-sm shrink-0', className)}
    style={{ backgroundColor: color }}
  />
)
