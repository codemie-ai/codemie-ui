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

import React, { ReactNode } from 'react'

import Tabs from '@/components/Tabs'
import { cn } from '@/utils/utils'

import VersionedFieldHistoryTab, { VersionedFieldOption } from './VersionedFieldHistoryTab'
import { Tab } from '../../Tabs/Tabs'

export const VERSIONED_FIELD_TAB_ID = {
  current: 'current',
  history: 'history',
} as const

export type VersionedFieldTabId =
  (typeof VERSIONED_FIELD_TAB_ID)[keyof typeof VERSIONED_FIELD_TAB_ID]

interface VersionedFieldProps {
  activeTab?: VersionedFieldTabId
  onTabChange: (tabId: VersionedFieldTabId) => void

  historyOptions: VersionedFieldOption[]
  selectedHistoryOption?: string | null
  onHistoryOptionChange: (optionValue: string) => void

  headerContent?: ReactNode
  tabsHeaderContent?: ReactNode
  historyTabHeaderContent?: ReactNode
  currentTab: ReactNode
  historyTab: ReactNode

  label?: string
  isLoading?: boolean
  isEditing?: boolean
  isFullHeight?: boolean
  isSmall?: boolean
  hideTabs?: boolean
  onRestore: () => void
  emptyPlaceholder?: string
}

const VersionedField: React.FC<VersionedFieldProps> = ({
  activeTab,
  onTabChange,

  historyOptions,
  selectedHistoryOption,
  onHistoryOptionChange,

  headerContent,
  tabsHeaderContent,
  historyTabHeaderContent,
  currentTab,
  historyTab,

  label,
  isLoading,
  isEditing,
  isFullHeight,
  isSmall,
  hideTabs = false,
  onRestore,
  emptyPlaceholder = 'Value was not yet modified',
}) => {
  const tabItems: Tab<VersionedFieldTabId>[] = [
    {
      id: 'current',
      label: 'Edit mode',
      element: currentTab,
    },
  ]

  if (isEditing)
    tabItems.push({
      id: 'history',
      label: 'Version History',
      element: (
        <VersionedFieldHistoryTab
          isLoading={isLoading}
          options={historyOptions}
          headerContent={historyTabHeaderContent}
          selectedOption={selectedHistoryOption}
          onRestore={onRestore}
          onOptionChange={(value) => onHistoryOptionChange(value)}
          emptyPlaceholder={emptyPlaceholder}
        >
          {historyTab}
        </VersionedFieldHistoryTab>
      ),
    })

  if (hideTabs) {
    const activeItem = tabItems.find((t) => t.id === activeTab) ?? tabItems[0]
    return <div className={cn(isFullHeight && 'h-full')}>{activeItem?.element}</div>
  }

  return (
    <div className={cn('flex flex-col gap-2', isFullHeight && 'h-full')}>
      {label && (
        <div className="flex items-center">
          <label className="text-sm text-text-quaternary">{label}</label>
          <div className="ml-auto gap-2">{headerContent}</div>
        </div>
      )}
      <Tabs
        tabs={tabItems}
        activeTab={activeTab}
        onChange={onTabChange}
        headerContent={tabsHeaderContent}
        className="h-full"
        isSmall={isSmall}
      />
    </div>
  )
}

export default VersionedField
