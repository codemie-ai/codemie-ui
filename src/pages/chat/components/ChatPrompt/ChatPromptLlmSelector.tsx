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

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import AiGenerateSvg from '@/assets/icons/ai-generate.svg?react'
import CheckSvg from '@/assets/icons/check.svg?react'
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import SearchableCombobox, { ComboboxItem } from '@/components/SearchableCombobox'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { cn } from '@/utils/utils'

interface ChatPromptLlmSelectorProps {
  disabled?: boolean
}

type LlmValue = string | null

const ASSISTANT_DEFAULT_VALUE = null
const ASSISTANT_DEFAULT_LABEL = 'Assistant Default'
const MAX_LABEL_LENGTH = 18

const LISTBOX_ID = 'chat-llm-selector-listbox'
const OPTION_ID_DEFAULT = 'chat-llm-selector-option-default'
const OPTION_ID_RECOMMENDED = 'chat-llm-selector-option-recommended'
const optionIdForModel = (value: string) => `chat-llm-selector-option-${value}`

const truncateLabel = (label: string) =>
  label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label

const ChatPromptLlmSelector: FC<ChatPromptLlmSelectorProps> = ({ disabled = false }) => {
  const [search, setSearch] = useState('')

  const { llmModels, getLLMModels } = useSnapshot(appInfoStore)
  const { currentChat, updateChat } = useSnapshot(chatsStore) as typeof chatsStore

  useEffect(() => {
    getLLMModels()
  }, [])

  const defaultModel = useMemo(() => {
    return llmModels.find((m) => m.isDefault) ?? llmModels[0] ?? null
  }, [llmModels])

  const selectedModel = useMemo(() => {
    if (!currentChat?.llmModel) return null
    return llmModels.find((m) => m.value === currentChat.llmModel) ?? null
  }, [currentChat?.llmModel, llmModels])

  const filteredModels = useMemo(() => {
    if (!search.trim()) return llmModels
    const q = search.toLowerCase()
    return llmModels.filter((m) => m.label.toLowerCase().includes(q))
  }, [llmModels, search])

  const items = useMemo<ComboboxItem<LlmValue>[]>(() => {
    const list: ComboboxItem<LlmValue>[] = []
    if (!search) {
      list.push({ id: OPTION_ID_DEFAULT, value: ASSISTANT_DEFAULT_VALUE })
      if (defaultModel) {
        list.push({ id: OPTION_ID_RECOMMENDED, value: defaultModel.value })
      }
    }
    filteredModels.forEach((m) => {
      list.push({ id: optionIdForModel(m.value), value: m.value })
    })
    return list
  }, [search, defaultModel, filteredModels])

  const isDefaultSelected = !currentChat?.llmModel

  const handleSelect = (value: LlmValue) => {
    if (!currentChat) return
    updateChat(currentChat.id, { llmModel: value })
    setSearch('')
  }

  const isOptionSelected = (item: ComboboxItem<LlmValue>) => {
    return (currentChat?.llmModel ?? null) === item.value
  }

  const triggerLabel = selectedModel ? truncateLabel(selectedModel.label) : 'Default'

  const renderTrigger = ({
    onClick,
  }: {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-tooltip-id="react-tooltip"
      data-tooltip-content="Select LLM model for this conversation"
      data-onboarding="chat-llm-selector"
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
        'text-text-quaternary hover:text-text-primary hover:bg-surface-elevated',
        !isDefaultSelected && 'text-text-primary bg-surface-elevated',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
      )}
    >
      <AiGenerateSvg className="w-4 h-4 shrink-0" />
      <span className="text-xs font-medium">{triggerLabel}</span>
      <ChevronDownSvg className="w-3 h-3 shrink-0 opacity-60" />
    </button>
  )

  const renderSeparatorBefore = (item: ComboboxItem<LlmValue>) => {
    if (item.id === OPTION_ID_RECOMMENDED) {
      return <div className="mx-3 my-1 border-t border-border-secondary" />
    }
    return null
  }

  const renderOption = (item: ComboboxItem<LlmValue>, state: { selected: boolean }) => {
    if (item.id === OPTION_ID_DEFAULT) {
      return (
        <>
          <span>{ASSISTANT_DEFAULT_LABEL}</span>
          {state.selected && <CheckSvg className="w-4 h-4 shrink-0" />}
        </>
      )
    }
    if (item.id === OPTION_ID_RECOMMENDED && defaultModel) {
      return (
        <>
          <div className="flex flex-col min-w-0">
            <span className="truncate">{defaultModel.label}</span>
            <span className="text-xs text-text-tertiary">Recommended</span>
          </div>
          {state.selected && <CheckSvg className="w-4 h-4 shrink-0" />}
        </>
      )
    }
    const model = llmModels.find((m) => m.value === item.value)
    if (!model) return null
    return (
      <>
        <span className="truncate">{model.label}</span>
        {state.selected && <CheckSvg className="w-4 h-4 shrink-0" />}
      </>
    )
  }

  const optionClassName = (item: ComboboxItem<LlmValue>, state: { selected: boolean }) => {
    if (item.id === OPTION_ID_DEFAULT) {
      return state.selected ? 'text-action-primary-solid font-medium' : 'text-text-secondary'
    }
    return state.selected ? 'text-action-primary-solid font-medium' : 'text-text-primary'
  }

  return (
    <SearchableCombobox<LlmValue>
      items={items}
      isOptionSelected={isOptionSelected}
      onSelect={handleSelect}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search models…"
      listboxId={LISTBOX_ID}
      listboxAriaLabel="LLM models"
      searchAriaLabel="Search LLM models"
      renderTrigger={renderTrigger}
      renderOption={renderOption}
      renderSeparatorBefore={renderSeparatorBefore}
      renderEmpty={() => (
        <p className="px-3 py-4 text-sm text-text-tertiary text-center">No models found</p>
      )}
      optionClassName={optionClassName}
      disabled={disabled}
    />
  )
}

ChatPromptLlmSelector.displayName = 'ChatPromptLlmSelector'

export default ChatPromptLlmSelector
