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

import React, { ReactNode } from 'react'

import { cn } from '@/utils/utils'

interface Props {
  url?: string
  target?: string
  label?: string | React.ReactNode
  className?: string
  onClick?: () => void
  children?: ReactNode
  tooltip?: string
  variant?: 'default' | 'dimmed'
}

const Link: React.FC<Props> = ({
  url,
  target = '_blank',
  variant = 'default',
  label,
  className,
  children,
  tooltip,
  onClick,
}) => {
  return (
    <a
      href={url}
      target={target}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={tooltip}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      className={cn(
        'text-text-accent-status hover:text-text-accent-status-hover cursor-pointer w-full max-w-[1200px]',
        variant === 'dimmed' && 'text-text-quaternary hover:text-text-primary',
        className
      )}
      onClick={onClick}
    >
      {children ?? label ?? url}
    </a>
  )
}

export default Link
