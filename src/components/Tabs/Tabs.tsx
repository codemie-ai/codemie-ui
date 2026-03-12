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

import { cn } from '@/utils/utils'

import TabsButton from './Tab'

export interface Tab<Id extends string = string> {
  id: Id
  label: string
  element: ReactNode
  icon?: ReactNode
  className?: string
}

export interface TabsProps<TabId extends string = string> {
  isSmall?: boolean
  isEmbedded?: boolean
  tabs: Tab<TabId>[]
  headerContent?: ReactNode
  activeTab?: TabId | null
  className?: string
  tabClassName?: string
  headerClassName?: string
  onChange?: (tabId: TabId) => void
  alwaysShowTabs?: boolean
}

const Tabs = <TabId extends string = string>({
  isSmall = false,
  isEmbedded = true,
  tabs,
  headerContent,
  activeTab: controlledActiveTab,
  className,
  tabClassName,
  headerClassName,
  onChange,
  alwaysShowTabs = false,
}: TabsProps<TabId>) => {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<TabId | undefined>(tabs[0]?.id)

  const activeTab = controlledActiveTab ?? uncontrolledActiveTab

  const handleTabsButtonClick = (tabId: TabId) => {
    if (!controlledActiveTab) setUncontrolledActiveTab(tabId)
    onChange?.(tabId)
  }

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.element

  const showTabs = alwaysShowTabs || tabs.length > 1

  return (
    <div className={cn('flex flex-col', className)}>
      {showTabs && (
        <div
          className={cn(
            'flex items-stretch border-b border-border-specific-panel-outline mb-4',
            headerClassName
          )}
        >
          {tabs.map((tab) => (
            <TabsButton
              key={tab.id}
              isSmall={isSmall}
              isEmbedded={isEmbedded}
              tab={tab}
              isActive={activeTab === tab.id}
              className={tab.className}
              handleClick={handleTabsButtonClick}
            />
          ))}
          {headerContent && <div className="ml-auto my-auto">{headerContent}</div>}
        </div>
      )}
      <div key={activeTab} role="tabpanel" className={cn('grow', tabClassName)}>
        {activeTabContent}
      </div>
    </div>
  )
}

export default Tabs
