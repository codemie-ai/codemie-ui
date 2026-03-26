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

import {
  useFloating,
  offset,
  shift,
  useHover,
  useDismiss,
  useInteractions,
  FloatingPortal,
  useRole,
  autoUpdate,
} from '@floating-ui/react'
import { ReactNode, useState } from 'react'

import { cn } from '@/utils/utils'

import DetailsBadge from './DetailsBadge'

export interface BadgeValue {
  value: string | number | boolean
  icon?: ReactNode
  onClick?: () => void
}

type BadgeItem = string | number | boolean | BadgeValue

interface DetailsBadgesProps {
  label?: string
  labelIcon?: ReactNode
  labelClassName?: string
  items: BadgeItem[]
  filled?: boolean
  className?: string
  badgeClassName?: string
  emptyMessage?: string
  maxDisplayed?: number
}

const isBadgeValue = (item: BadgeItem): item is BadgeValue => {
  return typeof item === 'object' && item !== null && 'value' in item
}

const DetailsBadges = ({
  label,
  labelIcon,
  labelClassName,
  items,
  filled = false,
  className,
  badgeClassName,
  emptyMessage,
  maxDisplayed,
}: DetailsBadgesProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const displayedItems = maxDisplayed ? items.slice(0, maxDisplayed) : items
  const remainingItems = maxDisplayed ? items.slice(maxDisplayed) : []

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  })

  const hover = useHover(context, {
    delay: { open: 200, close: 100 },
  })
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, dismiss, role])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <p
          className={cn(
            'flex items-center gap-2 font-semibold text-text-tertiary text-sm',
            labelClassName
          )}
        >
          {labelIcon}
          {label}
        </p>
      )}
      {!items?.length && emptyMessage && (
        <p className="text-text-primary text-sm">{emptyMessage}</p>
      )}
      {!!items?.length && (
        <div className="flex flex-wrap gap-1 items-center">
          {displayedItems.map((item, index) => {
            const badgeProps = isBadgeValue(item)
              ? item
              : { value: item, icon: undefined, onClick: undefined }

            return (
              <DetailsBadge
                key={index}
                filled={filled}
                className={badgeClassName}
                value={badgeProps.value}
                icon={badgeProps.icon}
              />
            )
          })}

          {remainingItems.length > 0 && (
            <>
              <div
                ref={refs.setReference}
                {...getReferenceProps()}
                className="flex justify-center items-center p-1.5 px-2 rounded-lg bg-surface-base-secondary border border-border-structural hover:border-border-specific-panel-outline-hover text-xs cursor-default"
              >
                +{remainingItems.length}
              </div>

              {isOpen && (
                <FloatingPortal>
                  <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="flex flex-col gap-1 bg-surface-base-secondary border border-border-structural rounded-lg shadow-lg p-2"
                  >
                    {remainingItems.map((item, index) => {
                      const badgeProps = isBadgeValue(item)
                        ? item
                        : { value: item, icon: undefined, onClick: undefined }

                      return (
                        <div
                          key={index}
                          className={cn(
                            'py-1.5 px-2 flex items-center gap-2 rounded-lg border border-border-specific-panel-outline font-semibold text-xs',
                            filled
                              ? 'bg-surface-base-secondary-tertiary'
                              : 'bg-surface-base-secondary'
                          )}
                        >
                          {badgeProps.icon} {String(badgeProps.value)}
                        </div>
                      )
                    })}
                  </div>
                </FloatingPortal>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DetailsBadges
