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

import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import AiGenerateSvg from '@/assets/icons/ai-generate.svg?react'
import CheckSvg from '@/assets/icons/check.svg?react'
import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import PremiumModelBadge, { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import SearchableCombobox, { ComboboxItem } from '@/components/SearchableCombobox'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { composeRowTooltip } from '@/utils/tooltipContent'
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

// Back to the pre-Task-11 sizing. The wide floor existed only to feed the
// badge's container query, and the containment that query needed was itself what
// made rows contribute zero intrinsic width. With premium on a meta line the
// name owns the row's full width, so the panel can shrink to its content again
// and the cap merely stops it running away.
const PANEL_CONTENT_CLASS = 'min-w-64 max-w-96'

const truncateLabel = (label: string) =>
  label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH)}…` : label

// The combobox row is `justify-between`, so mounting the check mark only on the
// selected row shifts everything before it. Reserving the slot on every row —
// hidden, not unmounted — keeps each premium badge at the same offset whichever
// row is selected.
const OptionCheckSlot: FC<{ selected: boolean }> = ({ selected }) => (
  <span
    data-testid="llm-option-check"
    aria-hidden={!selected}
    className={cn('flex shrink-0 items-center', !selected && 'invisible')}
  >
    <CheckSvg className="w-4 h-4 shrink-0" />
  </span>
)

// Left group: the name on the first line, the meta line under it. `min-w-0` is
// what lets the name truncate instead of pushing the reserved check slot out.
const OptionMain: FC<{ children: ReactNode }> = ({ children }) => (
  <span data-testid="llm-option-main" className="flex min-w-0 flex-1 flex-col text-left">
    {children}
  </span>
)

// The row is the single tooltip anchor of its subtree: nothing nested inside it
// anchors, so the pointer never crosses between two same-id anchors (which is
// what made the tooltip flicker). One content string per row.
const OptionRow: FC<{ content: string; children: ReactNode }> = ({ content, children }) => (
  <span
    data-testid="llm-option-row"
    className="flex w-full items-center justify-between gap-2"
    {...(content ? { 'data-tooltip-id': 'react-tooltip', 'data-tooltip-content': content } : {})}
  >
    {children}
  </span>
)

// Premium reads on the second line the recommended row already uses, so it never
// competes with the model name for horizontal width — the race the badge kept
// losing in one panel and winning in the other. A model that is both gets one
// line, not two. The amber token carries the premium signal the badge used to.
const OptionMeta: FC<{ recommended: boolean; isPremium: boolean }> = ({
  recommended,
  isPremium,
}) => {
  if (!recommended && !isPremium) return null
  return (
    <span data-testid="llm-option-meta" className="truncate text-xs text-text-tertiary">
      {recommended && 'Recommended'}
      {recommended && isPremium && ' · '}
      {isPremium && <span className="text-aborted-primary">Premium</span>}
    </span>
  )
}

// The meta line names the state; the hover still explains the rate consequence.
// Full name when the row truncates it, the premium sentence when the model is
// premium, both joined when both.
const ModelOptionRow: FC<{
  label: string
  isPremium: boolean
  selected: boolean
  recommended?: boolean
}> = ({ label, isPremium, selected, recommended = false }) => {
  const labelRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(labelRef)
  const content = composeRowTooltip([isTruncated && label, isPremium && PREMIUM_MODEL_TOOLTIP])

  return (
    <OptionRow content={content}>
      <OptionMain>
        <span ref={labelRef} className="truncate">
          {label}
        </span>
        <OptionMeta recommended={recommended} isPremium={isPremium} />
      </OptionMain>
      <OptionCheckSlot selected={selected} />
    </OptionRow>
  )
}

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
  const showPremiumBadge = selectedModel?.isPremium ?? false
  // When the badge is shown it already anchors the premium tooltip; a second
  // anchor on the surrounding button made the tooltip flicker as the pointer
  // crossed between them. Omit the attributes entirely rather than passing an
  // empty string, matching the ModelOptionLabel precedent.
  const triggerTooltipProps = showPremiumBadge
    ? {}
    : {
        'data-tooltip-id': 'react-tooltip',
        'data-tooltip-content': 'Select LLM model for this conversation',
      }

  const renderTrigger = ({
    onClick,
  }: {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      {...triggerTooltipProps}
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
      {showPremiumBadge && <PremiumModelBadge />}
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
        <ModelOptionRow
          label={ASSISTANT_DEFAULT_LABEL}
          isPremium={false}
          selected={state.selected}
        />
      )
    }
    if (item.id === OPTION_ID_RECOMMENDED && defaultModel) {
      return (
        <ModelOptionRow
          label={defaultModel.label}
          recommended
          isPremium={defaultModel.isPremium ?? false}
          selected={state.selected}
        />
      )
    }
    const model = llmModels.find((m) => m.value === item.value)
    if (!model) return null
    return (
      <ModelOptionRow
        label={model.label}
        isPremium={model.isPremium ?? false}
        selected={state.selected}
      />
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
      contentClassName={PANEL_CONTENT_CLASS}
      disabled={disabled}
    />
  )
}

ChatPromptLlmSelector.displayName = 'ChatPromptLlmSelector'

export default ChatPromptLlmSelector
