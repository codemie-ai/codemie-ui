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
  autoPlacement,
  useDismiss,
  useInteractions,
  useClick,
  useMergeRefs,
  FloatingPortal,
  Alignment,
  Placement,
} from '@floating-ui/react'
import React, { memo, MouseEventHandler, useId, useRef, useState } from 'react'
import { Link } from 'react-router'

import NavigationMoreSvg from '@/assets/icons/navigation-more.svg?react'
import { useFocusReturn } from '@/hooks/useFocusReturn'
import { cn } from '@/utils/utils'

export interface NavigationItem {
  title: string
  tooltip?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  href?: string
  divider?: false
  icon?: React.ReactNode
  disabled?: boolean
  hidden?: boolean
}

export interface NavigationDivider {
  title: string
  divider: true
}

export type NavigationMenuItem = NavigationItem | NavigationDivider

export const isNavigationDivider = (item: NavigationMenuItem): item is NavigationDivider =>
  (item as NavigationDivider).divider === true

/**
 * Prefer `contextId` when an entity name exists in the DOM; use `data-tooltip-content` for
 * action-only menus with no named entity.
 */
interface NavigationMoreProps {
  children?: React.ReactNode
  items?: Array<NavigationMenuItem>
  hideOnClickInside?: boolean
  customIcon?: React.ReactNode
  childrenFirst?: boolean
  renderInRoot?: boolean
  alignment?: Alignment | null
  placement?: Placement
  autoAlignment?: boolean
  onClick?: MouseEventHandler<Element>
  onOpenChange?: (open: boolean) => void
  className?: string
  buttonClassName?: string
  'data-tooltip-content'?: string
  contextId?: string
}

const NavigationMore: React.FC<NavigationMoreProps> = ({
  children,
  childrenFirst,
  items,
  hideOnClickInside = false,
  customIcon = null,
  renderInRoot,
  alignment = 'end',
  placement,
  autoAlignment,
  className,
  buttonClassName,
  onClick,
  onOpenChange,
  'data-tooltip-content': dataTooltipContent,
  contextId,
}) => {
  const [show, setShow] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const menuId = `nav-more-menu-${id}`
  const buttonId = `nav-more-btn-${id}`

  useFocusReturn(triggerRef, show)

  const handleOpenChange = (value: boolean) => {
    setShow(value)
    onOpenChange?.(value)
  }

  const visibleItems = items?.filter((item) => isNavigationDivider(item) || !item.hidden)
  const hasMenuContent =
    Boolean(children) || (visibleItems?.some((item) => !isNavigationDivider(item)) ?? false)

  const { refs, floatingStyles, context } = useFloating({
    open: show,
    placement,
    middleware: placement
      ? [offset(4), shift({ padding: 8 })]
      : [offset(4), autoPlacement({ alignment, autoAlignment }), shift({ padding: 8 })],
    onOpenChange: handleOpenChange,
    strategy: renderInRoot ? 'fixed' : 'absolute',
  })

  const dismiss = useDismiss(context, { ancestorScroll: true })
  const click = useClick(context, { enabled: hasMenuContent })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    {
      reference: { onClick },
    },
  ])

  const mergedTriggerRef = useMergeRefs([triggerRef, refs.setReference])

  const handleClickInside = () => {
    if (!hideOnClickInside) return
    handleOpenChange(false)
  }

  const menu = (
    <div
      ref={refs.setFloating}
      className="z-50"
      style={floatingStyles}
      onClick={handleClickInside}
      {...getFloatingProps()}
    >
      <div
        id={menuId}
        className="z-50 flex w-max min-w-44 max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-border-structural bg-surface-base-secondary px-2 py-2"
        role="menu"
        aria-label="Options"
      >
        {childrenFirst && children}
        {visibleItems && visibleItems.length > 0 && (
          <ul role="none">
            {visibleItems.map((item) => {
              if (isNavigationDivider(item)) {
                return (
                  <li key={item.title} role="none">
                    <hr className="my-1 border-t border-border-structural" />
                  </li>
                )
              }

              const itemClassName = cn(
                'flex items-center gap-3 px-1 py-2 text-xs w-full font-medium rounded-md outline-none text-text-primary leading-4 tracking-tight disabled:opacity-50 disabled:cursor-not-allowed',
                !item.disabled && 'hover:bg-surface-specific-dropdown-hover hover:text-text-accent',
                'hover:no-underline',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                item.href && item.disabled && 'pointer-events-none opacity-50'
              )

              const itemContent = (
                <>
                  <span
                    className="flex size-5 shrink-0 items-center justify-center"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="min-w-0 grow truncate text-left">{item.title}</span>
                </>
              )

              if (item.href) {
                return (
                  <li key={item.title} role="none">
                    <Link
                      to={item.href}
                      role="menuitem"
                      className={itemClassName}
                      aria-disabled={item.disabled}
                      aria-label={item.title}
                      data-tooltip-id="react-tooltip"
                      data-tooltip-content={item.tooltip}
                      onClick={(e) => {
                        if (item.disabled) {
                          e.preventDefault()
                          e.stopPropagation()
                          return
                        }
                        item.onClick?.(e as never)
                        if (hideOnClickInside) handleOpenChange(false)
                      }}
                    >
                      {itemContent}
                    </Link>
                  </li>
                )
              }

              return (
                <li key={item.title} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={itemClassName}
                    onClick={(e) => {
                      if (!item.disabled) item.onClick?.(e)
                      if (hideOnClickInside) handleOpenChange(false)
                    }}
                    disabled={item.disabled}
                    aria-label={item.title}
                    data-tooltip-id="react-tooltip"
                    data-tooltip-content={item.tooltip}
                  >
                    {itemContent}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {!childrenFirst && children}
      </div>
    </div>
  )

  return (
    <div className={cn('flex items-center relative', className)}>
      <button
        type="button"
        id={buttonId}
        ref={mergedTriggerRef}
        disabled={!hasMenuContent}
        className={cn(
          'm-1 p-1 rounded-md border border-transparent hover:bg-surface-specific-dropdown-hover transition',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          buttonClassName
        )}
        {...getReferenceProps()}
        aria-label={contextId ? undefined : dataTooltipContent || 'More options'}
        aria-labelledby={contextId ? `${buttonId} ${contextId}` : undefined}
        aria-haspopup="menu"
        aria-expanded={show}
        aria-controls={show ? menuId : undefined}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={dataTooltipContent}
      >
        {contextId && <span className="sr-only">More options</span>}
        {customIcon || <NavigationMoreSvg />}
      </button>

      {show && (renderInRoot ? <FloatingPortal>{menu}</FloatingPortal> : menu)}
    </div>
  )
}

export default memo(NavigationMore)
