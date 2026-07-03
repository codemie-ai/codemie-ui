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
  title: string
  description?: string
  children?: ReactNode
  headerContent?: ReactNode
  className?: string
}

const Sidebar = ({ title, description, children, headerContent, className }: SidebarProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(appInfoStore.sidebarExpanded)
  const { appearance } = useTheme()

  subscribe(appInfoStore, () => {
    setIsVisible(appInfoStore.sidebarExpanded)
  })

  const showGradient = appearance?.gradients ?? true

  return (
    <aside
      className={cn(
        'flex flex-col border-r min-h-full',
        showGradient && 'bg-sidebar-gradient',
        'transition-all ease-in-out duration-150 overflow-x-hidden shrink-0',
        {
          'w-sidebar max-w-sidebar': isVisible,
          'w-0': !isVisible,
          'border-border-specific-sidebar': !appearance,
          'border-border-structural': Boolean(appearance),
        }
      )}
    >
      <div className="pt-10 flex h-full flex-col min-w-sidebar w-sidebar max-w-sidebar">
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
