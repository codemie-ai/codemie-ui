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

import { useState } from 'react'

import TextDiffView from '@/components/TextDiffView/TextDiffView'
import { cn } from '@/utils/utils'

type HistoryViewTab = 'current' | 'previous'

const TABS: { id: HistoryViewTab; label: string }[] = [
  { id: 'previous', label: 'Previous Version' },
  { id: 'current', label: 'Current Version' },
]

interface SystemPromptVersionHistoryViewProps {
  historyText: string
  currentText: string
  previousHistoryText?: string
  title: string
}

const SystemPromptVersionHistoryView = ({
  historyText,
  currentText,
  previousHistoryText,
  title,
}: SystemPromptVersionHistoryViewProps) => {
  const [activeTab, setActiveTab] = useState<HistoryViewTab>('current')

  const oldText = activeTab === 'current' ? currentText : previousHistoryText ?? ''
  const newText = historyText

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex gap-5 w-fit border-b border-border-specific-panel-outline">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const isDisabled = tab.id === 'previous' && !previousHistoryText
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className="flex flex-col gap-3.5 items-start select-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    'text-xs font-mono text-text-primary leading-4',
                    isActive ? 'font-semibold' : 'font-normal'
                  )}
                >
                  {tab.label}
                </span>
                <div
                  className={cn(
                    'h-px self-stretch -mb-px',
                    isActive ? 'bg-text-primary' : 'bg-transparent'
                  )}
                />
              </button>
            )
          })}
        </div>
        <p className="text-xs font-mono text-text-quaternary">{title}</p>
      </div>

      <TextDiffView
        oldText={oldText}
        newText={newText}
        showLineNumbers
        columnClassName="border border-border-structural rounded-lg overflow-auto h-[56vh]"
      />
    </div>
  )
}

export default SystemPromptVersionHistoryView
