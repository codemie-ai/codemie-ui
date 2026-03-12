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

import { ComponentProps, forwardRef, useContext, useState } from 'react'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import VersionedField, {
  VersionedFieldTabId,
} from '@/components/form/VersionedField/VersionedField'
import Popup from '@/components/Popup'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import { assistantsStore } from '@/store'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { formatDate, createdBy, SHORT_DATE_FORMAT } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import ManagePromptVariablesPopup from './ManagePromptVariablesPopup'
import SystemPromptCurrentTab from './SystemPromptCurrentTab'
import SystemPromptDiffModal from './SystemPromptDiffModal'
import SystemPromptGenAIPopup from './SystemPromptGenAIPopup'
import { AssistantFormContext } from '../../AssistantForm'

interface SystemPromptProps {
  isAIGenerated?: boolean
  promptVariables: AssistantPromptVariable[]
  onUpdatePromptVariables: (variables: AssistantPromptVariable[]) => void
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur: () => void
  setIsAiGenerated: (value: boolean) => void
}

const buildVariableRegexp = (variable) => {
  return new RegExp(`{{\\s*${variable}\\s*}}`, 'g')
}

const SystemPrompt = forwardRef<TextareaRef, SystemPromptProps>(
  (
    {
      isAIGenerated,
      value,
      error,
      onChange,
      onBlur,
      setIsAiGenerated,
      promptVariables,
      onUpdatePromptVariables,
    },
    ref
  ) => {
    const { assistant, isChatConfig, isEditing, goBack } = useContext(AssistantFormContext)

    const [isExpanded, setIsExpanded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isGenAIPopupVisible, setIsGenAIPopupVisible] = useState(false)
    const [isDiffModalVisible, setIsDiffModalVisible] = useState(false)
    const [suggestedPrompt, setSuggestedPrompt] = useState('')
    const [isManagePromptVariblesVisible, setIsManagePromptVariblesVisible] = useState(false)

    const [activeTab, setActiveTab] = useState<VersionedFieldTabId>('current')
    const [selectedHistoryOption, setSelectedHistoryOption] = useState(
      assistant?.system_prompt_history[0] || null
    )

    const handleExpand = () => setIsExpanded(!isExpanded)
    const handleShowGenAIPopup = () => setIsGenAIPopupVisible(true)

    const handleCopyClick = () =>
      copyToClipboard(
        activeTab === 'history' ? selectedHistoryOption?.system_prompt : value,
        'System Prompt copied to clipboard'
      )

    const handleSuggestedPrompt = (suggested: string) => {
      if (!value || value.trim() === '') {
        onChange(suggested)
        setIsAiGenerated(true)
        return
      }

      setSuggestedPrompt(suggested)
      setIsDiffModalVisible(true)
    }

    const handleApplySuggestion = () => {
      onChange(suggestedPrompt)
      setIsAiGenerated(true)
      setIsDiffModalVisible(false)
      setSuggestedPrompt('')
    }

    const handleCancelDiff = () => {
      setIsDiffModalVisible(false)
      setSuggestedPrompt('')
    }

    const handleManagePromptVariables = () => {
      setIsManagePromptVariblesVisible(true)
    }

    const handleUpdatePromptVariables = (variables, updatedKeys) => {
      onUpdatePromptVariables(variables)
      setIsManagePromptVariblesVisible(false)

      if (updatedKeys)
        Object.keys(updatedKeys).forEach((key) => replaceVarible(key, updatedKeys[key]))
    }

    const replaceVarible = (oldVar: string, newVar: string) => {
      const re = buildVariableRegexp(oldVar)
      onChange(value.replace(re, `{{${newVar}}}`))
    }

    const handleUserPromptChange = (value2: string) => {
      onChange(value2)
      setIsAiGenerated(false)
    }
    const handleRestore = async () => {
      if (!assistant || !selectedHistoryOption) return
      setIsLoading(true)

      try {
        const response = await assistantsStore.updateAssistant(assistant.id, {
          ...assistant,
          system_prompt: selectedHistoryOption.system_prompt,
        })
        if (response.error) {
          toaster.error(response.error)
          return
        }
        if (isChatConfig) goBack?.()
        else goBackAssistants()
        toaster.info('Assistant system instructions have been restored successfully!')
      } finally {
        setIsLoading(false)
      }
    }

    const historyOptions =
      assistant?.system_prompt_history.map((entry) => ({
        label: `${formatDate(entry.date, SHORT_DATE_FORMAT)} - ${createdBy(entry.created_by)}`,
        value: entry.date,
      })) || []

    const sharedVersionedFieldProps: Omit<
      ComponentProps<typeof VersionedField>,
      'currentTab' | 'historyTab'
    > = {
      isLoading,
      isEditing,
      historyOptions,
      activeTab,
      selectedHistoryOption: selectedHistoryOption?.date,
      onRestore: () => handleRestore(),
      onTabChange: setActiveTab,
      onHistoryOptionChange: (value) => {
        setSelectedHistoryOption(
          assistant?.system_prompt_history.find((option) => option.date === value) || null
        )
      },
    }

    const sharedSystemPromptCurrentTabProps: Omit<
      ComponentProps<typeof SystemPromptCurrentTab>,
      'customPromptVariables'
    > = {
      ref,
      value,
      onBlur,
      onPromptChange: handleUserPromptChange,
      onShowGenAIPopup: handleShowGenAIPopup,
      onManagePromptVariables: handleManagePromptVariables,
    }

    return (
      <>
        <VersionedField
          {...sharedVersionedFieldProps}
          label={isEditing ? 'System Instructions' : ''}
          historyTabHeaderContent={
            <Button type="secondary" onClick={() => setIsExpanded(true)}>
              <ExpandSvg /> Expand
            </Button>
          }
          historyTab={
            <Textarea
              disabled
              rows={15}
              value={selectedHistoryOption?.system_prompt}
              rootClass="h-full mt-4"
              className="resize-none min-h-full"
            />
          }
          currentTab={
            <SystemPromptCurrentTab
              {...sharedSystemPromptCurrentTabProps}
              showLabel={!isEditing}
              customPromptVariables={promptVariables}
              isExpanded={false}
              isAIGenerated={isAIGenerated}
              error={error}
              onExpand={() => setIsExpanded(true)}
            />
          }
        />

        <SystemPromptGenAIPopup
          existingPrompt={value}
          isVisible={isGenAIPopupVisible}
          onSuggestedPrompt={handleSuggestedPrompt}
          onHide={() => setIsGenAIPopupVisible(false)}
        />

        <SystemPromptDiffModal
          visible={isDiffModalVisible}
          currentPrompt={value}
          suggestedPrompt={suggestedPrompt}
          onApply={handleApplySuggestion}
          onHide={handleCancelDiff}
        />

        <ManagePromptVariablesPopup
          promptVariables={promptVariables}
          isVisible={isManagePromptVariblesVisible}
          onHide={() => setIsManagePromptVariblesVisible(false)}
          onSave={handleUpdatePromptVariables}
        />

        <Popup
          hideFooter
          hideClose
          isFullWidth
          visible={isExpanded}
          onHide={handleExpand}
          className="h-[90vh] pb-6"
          headerContent={
            <div className="flex items-center justify-between">
              <h4>System Instructions</h4>
              <div className="flex gap-4">
                <Button
                  type="secondary"
                  onClick={handleCopyClick}
                  disabled={
                    isExpanded &&
                    activeTab === 'history' &&
                    !assistant?.system_prompt_history.length
                  }
                >
                  <CopySvg />
                  Copy
                </Button>
                <Button type="secondary" onClick={handleExpand}>
                  <CollapseSvg />
                  Collapse
                </Button>
              </div>
            </div>
          }
        >
          <VersionedField
            {...sharedVersionedFieldProps}
            isFullHeight
            historyTab={
              <div className="h-full pt-4">
                <Textarea
                  disabled
                  rows={15}
                  value={selectedHistoryOption?.system_prompt}
                  rootClass="h-full"
                  className="resize-none min-h-full"
                  onChange={(e) => onChange(e.target.value)}
                />
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
      </>
    )
  }
)

export default SystemPrompt
