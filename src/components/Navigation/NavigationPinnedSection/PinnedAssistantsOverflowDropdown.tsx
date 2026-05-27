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
  FloatingPortal,
  autoUpdate,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { assistantsStore } from '@/store/assistants'
import { cn } from '@/utils/utils'

import { NavSectionItem } from './NavigationPinnedSection'
import UnpinFromSidebarPopup from './UnpinFromSidebarPopup'

interface DropdownRowProps {
  item: NavSectionItem
  onRowClick: () => void
  onDeleteClick: (e: React.MouseEvent) => void
}

const DropdownRow: React.FC<DropdownRowProps> = ({ item, onRowClick, onDeleteClick }) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(spanRef)
  const [isButtonFocused, setIsButtonFocused] = useState(false)

  return (
    <div
      role="menuitem"
      tabIndex={0}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 mx-2 rounded-lg cursor-pointer',
        'hover:bg-surface-base-quateary transition-colors text-text-primary',
        'focus:outline-none focus-visible:bg-surface-base-quateary'
      )}
      onClick={onRowClick}
      onKeyDown={(e) => e.key === 'Enter' && onRowClick()}
    >
      <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
      <span
        ref={spanRef}
        className="text-sm truncate flex-1"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={isTruncated ? item.name : ''}
        data-tooltip-place="top"
      >
        {item.name}
      </span>
      {item.isDeletable && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden={isButtonFocused ? undefined : true}
          aria-label={`Remove ${item.name} from sidebar`}
          className={cn(
            'p-1 rounded hover:bg-surface-interactive-hover transition-colors flex-shrink-0 text-icon-primary',
            'opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none'
          )}
          onClick={onDeleteClick}
          onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
          onFocus={() => setIsButtonFocused(true)}
          onBlur={() => setIsButtonFocused(false)}
        >
          <DeleteSvg className="w-[18px] h-[18px] text-icon-primary" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

interface PinnedAssistantsOverflowDropdownProps {
  items: NavSectionItem[]
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

const PinnedAssistantsOverflowDropdown: React.FC<PinnedAssistantsOverflowDropdownProps> = ({
  items,
  onClose,
  anchorRef,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const wheelCleanupRef = useRef<(() => void) | null>(null)
  const [unpinTarget, setUnpinTarget] = useState<NavSectionItem | null>(null)
  const unpinTargetRef = useRef<NavSectionItem | null>(null)
  unpinTargetRef.current = unpinTarget

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: true,
    onOpenChange: (open) => !open && onClose(),
    placement: 'right-end',
    strategy: 'fixed',
    middleware: [offset(8), shift()],
    whileElementsMounted: autoUpdate,
  })

  const dismiss = useDismiss(context, {
    escapeKey: false,
    enabled: !unpinTarget,
  })
  useInteractions([dismiss])

  useEffect(() => {
    refs.setReference(anchorRef.current)
  }, [anchorRef, refs.setReference])

  useEffect(() => {
    const id = setTimeout(() => {
      dropdownRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    }, 0)
    return () => clearTimeout(id)
  }, [])

  const setFloatingRef = useCallback(
    (el: HTMLDivElement | null) => {
      refs.setFloating(el)
      ;(dropdownRef as { current: HTMLDivElement | null }).current = el

      wheelCleanupRef.current?.()
      wheelCleanupRef.current = null

      if (el) {
        const handleWheel = (e: WheelEvent) => {
          const { scrollTop, scrollHeight, clientHeight } = el
          const atTop = e.deltaY < 0 && scrollTop === 0
          const atBottom = e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight
          if (atTop || atBottom || scrollHeight <= clientHeight) {
            e.preventDefault()
          }
        }
        el.addEventListener('wheel', handleWheel, { passive: false })
        wheelCleanupRef.current = () => el.removeEventListener('wheel', handleWheel)
      }
    },
    [refs.setFloating]
  )

  const handleTabKey = (
    e: React.KeyboardEvent<HTMLDivElement>,
    menuItems: HTMLElement[],
    currentIndex: number,
    isOnDeleteButton: boolean,
    parentRow: HTMLElement | null,
    activeEl: HTMLElement
  ) => {
    e.preventDefault()
    if (isOnDeleteButton) {
      if (e.shiftKey) {
        parentRow?.focus()
      } else {
        menuItems[(currentIndex + 1) % menuItems.length]?.focus()
      }
      return
    }
    if (e.shiftKey) {
      const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length
      const prevDeleteBtn = menuItems[prevIndex]?.querySelector<HTMLElement>('button')
      if (prevDeleteBtn) prevDeleteBtn.focus()
      else menuItems[prevIndex]?.focus()
    } else {
      const deleteBtn = activeEl.querySelector<HTMLElement>('button')
      if (deleteBtn) deleteBtn.focus()
      else menuItems[(currentIndex + 1) % menuItems.length]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (unpinTargetRef.current) return
    const menuItems = Array.from(
      dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    )
    const activeEl = document.activeElement as HTMLElement
    const parentRow = activeEl.closest<HTMLElement>('[role="menuitem"]')
    const isOnDeleteButton = activeEl.tagName === 'BUTTON' && !!parentRow
    const currentIndex =
      isOnDeleteButton && parentRow ? menuItems.indexOf(parentRow) : menuItems.indexOf(activeEl)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        menuItems[(currentIndex + 1) % menuItems.length]?.focus()
        break
      case 'ArrowUp':
        e.preventDefault()
        menuItems[(currentIndex - 1 + menuItems.length) % menuItems.length]?.focus()
        break
      case 'Tab':
        handleTabKey(e, menuItems, currentIndex, isOnDeleteButton, parentRow, activeEl)
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        ;(anchorRef.current as HTMLElement)?.focus()
        break
      default:
        break
    }
  }

  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined
    if (unpinTarget) {
      id = setTimeout(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
        const firstFocusable = dialog?.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 0)
    }
    return () => clearTimeout(id)
  }, [unpinTarget])

  const focusDropdown = () => {
    setTimeout(() => {
      dropdownRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    }, 0)
  }

  const handleRowClick = (item: NavSectionItem) => {
    onClose()
    item.onClick()
  }

  const handleDeleteClick = (e: React.MouseEvent, item: NavSectionItem) => {
    e.stopPropagation()
    setUnpinTarget(item)
  }

  const handleUnpinConfirm = async () => {
    if (unpinTarget) {
      await assistantsStore.unpinAssistant(unpinTarget.id)
    }
    setUnpinTarget(null)
    focusDropdown()
  }

  return (
    <FloatingPortal>
      <div
        ref={setFloatingRef}
        style={{ ...floatingStyles, visibility: isPositioned ? 'visible' : 'hidden' }}
        className={cn(
          'z-50',
          'bg-surface-base-secondary border border-border-structural rounded-lg shadow-lg',
          'w-[324px] py-2 max-h-[266px] overflow-y-auto'
        )}
        role="menu"
        tabIndex={-1}
        aria-label="All pinned assistants"
        onKeyDown={handleKeyDown}
      >
        {items.map((item) => (
          <DropdownRow
            key={item.id}
            item={item}
            onRowClick={() => handleRowClick(item)}
            onDeleteClick={(e) => handleDeleteClick(e, item)}
          />
        ))}
      </div>

      {unpinTarget && (
        <UnpinFromSidebarPopup
          visible={true}
          assistantName={unpinTarget.name}
          onConfirm={handleUnpinConfirm}
          onCancel={() => {
            setUnpinTarget(null)
            focusDropdown()
          }}
        />
      )}
    </FloatingPortal>
  )
}

export default PinnedAssistantsOverflowDropdown
