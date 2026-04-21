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

import { OverlayPanel } from 'primereact/overlaypanel'
import { ChangeEvent, FC, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import AiGenerateSvg from '@/assets/icons/ai-generate.svg?react'
import CheckSvg from '@/assets/icons/check.svg?react'
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { cn } from '@/utils/utils'

interface ChatPromptLlmSelectorProps {
  disabled?: boolean
}

const ASSISTANT_DEFAULT_VALUE = null
const ASSISTANT_DEFAULT_LABEL = 'Assistant Default'
const MAX_LABEL_LENGTH = 18

const truncateLabel = (label: string) =>
  label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label

const ChatPromptLlmSelector: FC<ChatPromptLlmSelectorProps> = ({ disabled = false }) => {
  const overlayRef = useRef<OverlayPanel>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
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

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    overlayRef.current?.toggle(e)
  }

  const handleSelect = (value: string | null) => {
    if (!currentChat) return
    updateChat(currentChat.id, { llmModel: value })
    overlayRef.current?.hide()
    setSearch('')
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleOverlayShow = () => {
    setSearch('')
    // Focus the search input after the panel renders
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const isDefaultSelected = !currentChat?.llmModel

  const triggerLabel = selectedModel ? truncateLabel(selectedModel.label) : 'Default'

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
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

      <OverlayPanel
        ref={overlayRef}
        onShow={handleOverlayShow}
        className="bg-surface-base-secondary rounded-lg border border-border-structural shadow-xl p-0 overflow-hidden"
      >
        <div className="flex flex-col min-w-56 max-w-72">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search models…"
              className={cn(
                'w-full text-sm bg-surface-elevated border border-border-secondary rounded-md',
                'px-2.5 py-1.5 text-text-primary placeholder:text-text-quaternary',
                'outline-none focus:border-border-accent transition-colors'
              )}
            />
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto pb-2">
            {/* Assistant Default option */}
            {!search && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelect(ASSISTANT_DEFAULT_VALUE)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2',
                    'text-sm text-left transition-colors hover:bg-surface-elevated cursor-pointer',
                    isDefaultSelected
                      ? 'text-action-primary-solid font-medium'
                      : 'text-text-secondary'
                  )}
                >
                  <span>{ASSISTANT_DEFAULT_LABEL}</span>
                  {isDefaultSelected && <CheckSvg className="w-4 h-4 shrink-0" />}
                </button>
                <div className="mx-3 my-1 border-t border-border-secondary" />
              </>
            )}

            {/* Recommended (default model) */}
            {!search && defaultModel && (
              <button
                type="button"
                onClick={() => handleSelect(defaultModel.value)}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2',
                  'text-sm text-left transition-colors hover:bg-surface-elevated cursor-pointer',
                  currentChat?.llmModel === defaultModel.value
                    ? 'text-action-primary-solid font-medium'
                    : 'text-text-primary'
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{defaultModel.label}</span>
                  <span className="text-xs text-text-tertiary">Recommended</span>
                </div>
                {currentChat?.llmModel === defaultModel.value && (
                  <CheckSvg className="w-4 h-4 shrink-0" />
                )}
              </button>
            )}

            {/* All models */}
            {filteredModels.length === 0 && (
              <p className="px-3 py-4 text-sm text-text-tertiary text-center">No models found</p>
            )}
            {filteredModels.map((model) => {
              const isSelected = currentChat?.llmModel === model.value
              return (
                <button
                  key={model.value}
                  type="button"
                  onClick={() => handleSelect(model.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-3 py-2',
                    'text-sm text-left transition-colors hover:bg-surface-elevated cursor-pointer',
                    isSelected ? 'text-action-primary-solid font-medium' : 'text-text-primary'
                  )}
                >
                  <span className="truncate">{model.label}</span>
                  {isSelected && <CheckSvg className="w-4 h-4 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </OverlayPanel>
    </>
  )
}

ChatPromptLlmSelector.displayName = 'ChatPromptLlmSelector'

export default ChatPromptLlmSelector
