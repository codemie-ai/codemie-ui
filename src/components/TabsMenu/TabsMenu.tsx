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

import { TabMenu, TabMenuPassThroughOptions } from 'primereact/tabmenu'
import { classNames as cn } from 'primereact/utils'

import type { MenuItem } from 'primereact/menuitem'

interface CustomTabMenuProps {
  tabs: MenuItem[]
  activeTabId: string
  onTabChange: (newTabId: string) => void
}

const TabsMenu = ({ tabs, activeTabId, onTabChange }: CustomTabMenuProps) => {
  return (
    <TabMenu
      model={tabs}
      activeIndex={0}
      onTabChange={(e) => onTabChange(e.value.id as string)}
      pt={createTabMenuPT(activeTabId)}
    />
  )
}

const createTabMenuPT = (activeTabId: string): TabMenuPassThroughOptions => ({
  root: {
    className: cn(
      'mb-5',
      'relative',
      'after:content-[""]',
      'after:absolute',
      'after:bottom-0',
      'after:left-0',
      'after:w-full',
      'after:h-[1px]',
      'after:bg-border-specific-panel-outline',
      'after:-z-10'
    ),
  },
  menuitem: ({ context }: any) => ({
    className: cn(
      'text-text-primary mr-6 py-3 [&>a]:no-underline text-h5 border-b border-transparent relative',
      {
        'font-bold border-text-primary cursor-default pointer-events-none':
          context.item.id === activeTabId,
      }
    ),
  }),
})

export default TabsMenu
