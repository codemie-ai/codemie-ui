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

import ProcessingStatusSvg from '@/assets/icons/processing-status.svg?react'
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
  onRestore,
  emptyPlaceholder = 'Value was not yet modified',
}) => {
  const tabItems: Tab<VersionedFieldTabId>[] = [
    {
      id: 'current',
      label: 'Edit Current Version',
      element: currentTab,
    },
  ]

  if (isEditing)
    tabItems.push({
      id: 'history',
      label: 'History',
      icon: <ProcessingStatusSvg />,
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

  return (
    <div className={cn('flex flex-col gap-2', isFullHeight && 'h-full')}>
      {label && (
        <div className="flex items-center">
          <label className="text-sm">{label}</label>
          <div className="ml-auto gap-2">{headerContent}</div>
        </div>
      )}
      <Tabs
        tabs={tabItems}
        activeTab={activeTab}
        onChange={onTabChange}
        headerContent={tabsHeaderContent}
        className="h-full"
      />
    </div>
  )
}

export default VersionedField
