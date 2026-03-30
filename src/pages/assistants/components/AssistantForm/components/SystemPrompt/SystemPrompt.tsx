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

import { ComponentProps, forwardRef, useContext } from 'react'

import { TextareaRef } from '@/components/form/Textarea'
import { goBackAssistants } from '@/pages/assistants/utils/goBackAssistants'
import { assistantsStore } from '@/store'
import { AssistantPromptVariable } from '@/types/entity/assistant'
import { formatDate, createdBy, SHORT_DATE_FORMAT } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { copyToClipboard } from '@/utils/utils'

import ManagePromptVariablesPopup from './ManagePromptVariablesPopup'
import SystemPromptCurrentTab from './SystemPromptCurrentTab'
import SystemPromptDiffModal from './SystemPromptDiffModal'
import { SystemPromptExpandedModal } from './SystemPromptExpandedModal'
import SystemPromptGenAIPopup from './SystemPromptGenAIPopup'
import { useSystemPromptState } from './useSystemPromptState'
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

    const {
      isExpanded,
      setIsExpanded,
      isLoading,
      setIsLoading,
      isGenAIPopupVisible,
      setIsGenAIPopupVisible,
      isDiffModalVisible,
      setIsDiffModalVisible,
      suggestedPrompt,
      setSuggestedPrompt,
      isManagePromptVariblesVisible,
      setIsManagePromptVariblesVisible,
      activeTab,
      setActiveTab,
      selectedHistoryOption,
      setSelectedHistoryOption,
    } = useSystemPromptState(assistant)

    const handleExpand = () => setIsExpanded(!isExpanded)
    const handleShowVersionHistory = () => {
      setIsExpanded(true)
      setActiveTab('history')
    }
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
      assistant?.system_prompt_history.map((entry, index) => {
        const versionNumber = assistant.system_prompt_history.length - index
        return {
          label: `[${String(versionNumber).padStart(2, '0')}] - ${formatDate(
            entry.date,
            SHORT_DATE_FORMAT
          )} - ${createdBy(entry.created_by)}`,
          value: entry.date,
        }
      }) || []

    const sharedSystemPromptCurrentTabProps: Omit<
      ComponentProps<typeof SystemPromptCurrentTab>,
      'customPromptVariables' | 'onShowVersionHistory'
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
        <div className="flex flex-col gap-2">
          {isEditing && (
            <label className="text-sm font-mono text-text-quaternary">System Instructions</label>
          )}
          <SystemPromptCurrentTab
            {...sharedSystemPromptCurrentTabProps}
            showLabel={!isEditing}
            customPromptVariables={promptVariables}
            isExpanded={false}
            isAIGenerated={isAIGenerated}
            error={error}
            onExpand={() => setIsExpanded(true)}
            {...(isEditing && { onShowVersionHistory: handleShowVersionHistory })}
          />
        </div>

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

        <SystemPromptExpandedModal
          isExpanded={isExpanded}
          activeTab={activeTab}
          selectedHistoryOption={selectedHistoryOption}
          assistant={assistant}
          isEditing={isEditing}
          isLoading={isLoading}
          promptVariables={promptVariables}
          value={value}
          onExpand={handleExpand}
          onCopyClick={handleCopyClick}
          onTabChange={setActiveTab}
          onRestore={handleRestore}
          onHistoryOptionChange={(value) => {
            setSelectedHistoryOption(
              assistant?.system_prompt_history.find((option) => option.date === value) || null
            )
          }}
          sharedSystemPromptCurrentTabProps={sharedSystemPromptCurrentTabProps}
          historyOptions={historyOptions}
        />
      </>
    )
  }
)

export default SystemPrompt
