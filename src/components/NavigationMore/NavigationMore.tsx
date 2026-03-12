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
  FloatingPortal,
  Alignment,
} from '@floating-ui/react'
import React, { memo, MouseEventHandler, useState } from 'react'

import NavigationMoreSvg from '@/assets/icons/navigation-more.svg?react'
import { cn } from '@/utils/utils'

export interface NavigationItem {
  title: string
  tooltip?: string
  onClick: MouseEventHandler<HTMLButtonElement>
  icon?: React.ReactNode
  disabled?: boolean
  hidden?: boolean
}

interface NavigationMoreProps {
  children?: React.ReactNode
  items?: Array<NavigationItem>
  hideOnClickInside?: boolean
  customIcon?: React.ReactNode
  childrenFirst?: boolean
  renderInRoot?: boolean
  alignment?: Alignment | null
  autoAlignment?: boolean
  onClick?: MouseEventHandler<Element>
  className?: string
  buttonClassName?: string
  'data-tooltip-content'?: string
}

const NavigationMore: React.FC<NavigationMoreProps> = ({
  children,
  childrenFirst,
  items,
  hideOnClickInside = false,
  customIcon = null,
  renderInRoot,
  alignment = 'end',
  autoAlignment,
  className,
  buttonClassName,
  onClick,
  'data-tooltip-content': dataTooltipContent,
}) => {
  const [show, setShow] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: show,
    middleware: [offset(4), shift(), autoPlacement({ alignment, autoAlignment })],
    onOpenChange: setShow,
  })

  const dismiss = useDismiss(context)
  const click = useClick(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    {
      reference: { onClick },
    },
  ])

  const handleClickInside = () => {
    if (!hideOnClickInside) return
    setShow(false)
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
        className="flex flex-col bg-surface-base-secondary rounded-lg border border-border-structural z-50 w-44 py-2 px-2"
        role="menu"
        aria-label="Export options"
      >
        {childrenFirst && children}
        {items?.map((item) => {
          return (
            !item.hidden && (
              <button
                type="button"
                role="menuitem"
                className={cn(
                  'flex items-center gap-4 px-1 py-2 text-xs w-full font-medium rounded-md outline-none text-text-primary leading-4 tracking-tight disabled:text-text-quaternary',
                  !item.disabled &&
                    'hover:bg-surface-specific-dropdown-hover hover:text-text-accent',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500'
                )}
                key={item.title}
                onClick={(e) => {
                  if (!item.disabled) item.onClick(e)
                  if (hideOnClickInside) setShow(false)
                }}
                disabled={item.disabled}
                aria-label={item.title}
                data-tooltip-id="react-tooltip"
                data-tooltip-content={item.tooltip}
              >
                <span
                  className="w-[18px] h-[18px] flex justify-center items-center"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="text-left grow">{item.title}</span>
              </button>
            )
          )
        })}

        {!childrenFirst && children}
      </div>
    </div>
  )

  return (
    <div className={cn('flex items-center relative', className)}>
      <button
        type="button"
        ref={refs.setReference}
        className={cn(
          'm-1 p-1 rounded-md border border-transparent hover:bg-surface-specific-dropdown-hover transition',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          buttonClassName
        )}
        {...getReferenceProps()}
        aria-label={dataTooltipContent || 'More options'}
        aria-haspopup="menu"
        aria-expanded={show}
        data-tooltip-id="react-tooltip"
        data-tooltip-content={dataTooltipContent}
      >
        {customIcon || <NavigationMoreSvg />}
      </button>

      {show && (renderInRoot ? <FloatingPortal>{menu}</FloatingPortal> : menu)}
    </div>
  )
}

export default memo(NavigationMore)
