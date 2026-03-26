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

import { classNames } from 'primereact/utils'
import { ReactNode } from 'react'

import { cn } from '@/utils/utils'

interface SidebarTagsProps {
  labelIcon?: ReactNode
  label?: string
  labelClassName?: string
  noItemsMessage?: string
  className?: string
  items?: { value: string; icon?: ReactNode; onClick?: () => void }[]
  filledTags?: boolean
  children?: ReactNode
}

const SidebarTags = ({
  labelIcon,
  label,
  labelClassName,
  noItemsMessage,
  className,
  items,
  filledTags,
  children,
}: SidebarTagsProps) => {
  const itemClass = (item) => {
    return classNames(
      'py-1.5 px-2 flex items-center gap-2 rounded-lg bg-surface-base-secondary border border-border-specific-panel-outline font-semibold',
      filledTags && 'bg-surface-base-chat',
      {
        'hover:bg-border-structural transition cursor-pointer': item.onClick,
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent, onClick?: () => void) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div className={cn('text-xs flex flex-col gap-2', className)}>
      {label && (
        <p
          className={cn(
            'flex items-center gap-2 font-semibold text-text-quaternary',
            labelClassName
          )}
        >
          {labelIcon}
          {label}
        </p>
      )}
      {!items?.length && <p className="text-text-quaternary">{noItemsMessage}</p>}
      {!!items?.length && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <div
              key={`${item.value}_${index}`}
              className={itemClass(item)}
              onClick={item.onClick}
              {...(item.onClick && {
                onKeyDown: (e) => handleKeyDown(e, item.onClick),
                tabIndex: 0,
                role: 'link',
              })}
            >
              {item.icon} {item.value}
            </div>
          ))}
          {children}
        </div>
      )}
    </div>
  )
}

export default SidebarTags
