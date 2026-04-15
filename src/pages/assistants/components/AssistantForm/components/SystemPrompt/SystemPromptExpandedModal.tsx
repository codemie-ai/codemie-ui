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

import { ComponentProps } from 'react'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import VersionedField, {
  VERSIONED_FIELD_TAB_ID,
  VersionedFieldTabId,
} from '@/components/form/VersionedField/VersionedField'
import Popup from '@/components/Popup'
import { Assistant, AssistantPromptVariable } from '@/types/entity/assistant'
import { formatDateTime, createdBy } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import SystemPromptCurrentTab from './SystemPromptCurrentTab'
import SystemPromptVersionHistoryView from './SystemPromptVersionHistoryView'

interface SystemPromptExpandedModalProps {
  isExpanded: boolean
  activeTab: VersionedFieldTabId
  selectedHistoryOption: Assistant['system_prompt_history'][0] | null
  assistant?: Assistant | null
  isEditing?: boolean
  isLoading: boolean
  promptVariables: AssistantPromptVariable[]
  value: string
  onExpand: () => void
  onCopyClick: () => void
  onTabChange: (tab: VersionedFieldTabId) => void
  onRestore: () => void
  onHistoryOptionChange: (value: string) => void
  sharedSystemPromptCurrentTabProps: Omit<
    ComponentProps<typeof SystemPromptCurrentTab>,
    'customPromptVariables' | 'onShowVersionHistory' | 'isExpanded'
  >
  historyOptions: Array<{ label: string; value: string }>
}

export const SystemPromptExpandedModal = ({
  isExpanded,
  activeTab,
  selectedHistoryOption,
  assistant,
  isEditing,
  isLoading,
  promptVariables,
  value,
  onExpand,
  onCopyClick,
  onTabChange,
  onRestore,
  onHistoryOptionChange,
  sharedSystemPromptCurrentTabProps,
  historyOptions,
}: SystemPromptExpandedModalProps) => {
  return (
    <Popup
      hideFooter
      hideClose
      isFullWidth
      visible={isExpanded}
      onHide={onExpand}
      className="h-[90vh] pb-6"
      headerContent={
        <div className="flex flex-col w-full gap-4 py-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold font-mono text-text-primary">
              System Instructions
            </span>
            <div className="flex gap-4">
              <Button
                type="secondary"
                onClick={onCopyClick}
                disabled={activeTab === 'history' && !assistant?.system_prompt_history.length}
              >
                <CopySvg />
                Copy
              </Button>
              <Button type="secondary" onClick={onExpand}>
                <CollapseSvg />
                Collapse
              </Button>
            </div>
          </div>
          {isEditing && (
            <div className="flex gap-5 w-fit border-b border-border-specific-panel-outline">
              {[
                { id: VERSIONED_FIELD_TAB_ID.current, label: 'Edit mode' },
                { id: VERSIONED_FIELD_TAB_ID.history, label: 'Version History' },
              ].map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className="flex flex-col gap-3.5 items-start select-none"
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
          )}
        </div>
      }
    >
      <VersionedField
        isLoading={isLoading}
        isEditing={isEditing}
        historyOptions={historyOptions}
        activeTab={activeTab}
        selectedHistoryOption={selectedHistoryOption?.date}
        onRestore={onRestore}
        onTabChange={onTabChange}
        onHistoryOptionChange={(value) => {
          onHistoryOptionChange(value)
        }}
        isFullHeight
        hideTabs
        historyTab={
          <div className="h-full pt-4">
            {selectedHistoryOption &&
              (() => {
                const history = assistant?.system_prompt_history ?? []
                const selectedIndex = history.findIndex(
                  (h) => h.date === selectedHistoryOption.date
                )
                const previousEntry = history[selectedIndex + 1]
                return (
                  <SystemPromptVersionHistoryView
                    key={selectedHistoryOption.date}
                    historyText={selectedHistoryOption.system_prompt}
                    currentText={value}
                    previousHistoryText={previousEntry?.system_prompt}
                    title={`${formatDateTime(selectedHistoryOption.date, 'short')} — ${createdBy(
                      selectedHistoryOption.created_by
                    )}`}
                  />
                )
              })()}
          </div>
        }
        currentTab={
          <SystemPromptCurrentTab
            {...sharedSystemPromptCurrentTabProps}
            isExpanded={true}
            customPromptVariables={promptVariables}
          />
        }
      />
    </Popup>
  )
}
