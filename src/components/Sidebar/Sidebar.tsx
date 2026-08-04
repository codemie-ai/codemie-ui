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

import { ReactNode, useState } from 'react'
import { subscribe } from 'valtio'

import { useTheme } from '@/hooks/useTheme'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

import SidebarToggle from './SidebarToggle'

interface SidebarProps {
  id?: string
  title: string
  description?: string
  children?: ReactNode
  headerContent?: ReactNode
  className?: string
  /**
   * When true, the sidebar fills its container's width and height and lets the
   * parent own collapse/expand (used by the chat page, where a resizable
   * `Panel` controls the width). When false (default, all other pages) the
   * sidebar keeps its fixed `w-sidebar` width and collapses to `w-0` in sync
   * with `appInfoStore.sidebarExpanded`.
   */
  fillContainer?: boolean
}

const Sidebar = ({
  id,
  title,
  description,
  children,
  headerContent,
  className,
  fillContainer = false,
}: SidebarProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(appInfoStore.sidebarExpanded)
  const { appearance } = useTheme()

  subscribe(appInfoStore, () => {
    setIsVisible(appInfoStore.sidebarExpanded)
  })

  const showGradient = appearance?.gradients ?? true

  return (
    <aside
      id={id}
      className={cn(
        'flex flex-col min-h-full',
        showGradient && 'bg-sidebar-gradient',
        'transition-all ease-in-out duration-150 overflow-x-hidden shrink-0',
        {
          'w-full h-full': fillContainer,
          'w-sidebar max-w-sidebar': !fillContainer && isVisible,
          'w-0': !fillContainer && !isVisible,
          'border-r': isVisible,
          'border-border-specific-sidebar': !appearance,
          'border-border-structural': Boolean(appearance),
        }
      )}
    >
      <div
        className={cn(
          'pt-10 flex h-full flex-col',
          fillContainer ? 'w-full' : 'min-w-sidebar w-sidebar max-w-sidebar'
        )}
      >
        <div className="flex justify-between items-center px-6">
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          {headerContent}
        </div>
        {description && (
          <p className="text-sm text-text-quaternary font-semibold mt-1 px-6">{description}</p>
        )}
        <div className={cn('mt-7 h-full z-[10] overflow-y-auto px-6', className)}>{children}</div>
      </div>
      <SidebarToggle />
    </aside>
  )
}

export default Sidebar
