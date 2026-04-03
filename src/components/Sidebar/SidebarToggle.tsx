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
import { useState, useEffect } from 'react'
import { subscribe } from 'valtio'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { appInfoStore } from '@/store/appInfo'

const SidebarToggle = () => {
  const [isOpen, setIsOpen] = useState<boolean>(appInfoStore.sidebarExpanded)
  const SHORTCUT_TRIGGER = 'KeyB'

  useEffect(() => {
    const handleKeydown = (event) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey
      const isBKey = event.code === SHORTCUT_TRIGGER

      if (isCtrlPressed && isBKey) {
        event.preventDefault()
        appInfoStore.toggleSidebar()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [appInfoStore.sidebarExpanded])

  subscribe(appInfoStore, () => {
    setIsOpen(appInfoStore.sidebarExpanded)
  })

  const sidebarOffsetClass = useSidebarOffsetClass()

  const toggle = () => {
    appInfoStore.toggleSidebar()
  }

  return (
    sidebarOffsetClass && (
      <button
        type="button"
        aria-label={isOpen ? 'Hide Sidebar' : 'Open Sidebar'}
        className={classNames(
          'bg-curve absolute left-0 top-[calc(50%-100px)] flex',
          'items-center justify-center cursor-pointer bg-surface-base-primary-border',
          'w-[24px] h-[128px] select-none bg-text-primary/10 hover:bg-text-primary/15',
          'transition-all duration-150 z-10',
          sidebarOffsetClass
        )}
        onClick={toggle}
      >
        <ChevronLeftSvg
          aria-hidden="true"
          className={classNames('scale-[140%] mr-[3.5px]', {
            'rotate-180': !isOpen,
          })}
        />
      </button>
    )
  )
}

export default SidebarToggle
