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

import { type MultiSelect as TMultiSelect } from 'primereact/multiselect'
import React, { useState, useEffect, forwardRef, useContext, useRef, useCallback } from 'react'
import { useSnapshot } from 'valtio'

import Avatar from '@/components/Avatar/Avatar'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { AssistantIndexScope } from '@/constants/assistants'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { usePaginatedOptions, LoadListParams, LoadListResult } from '@/hooks/usePaginatedOptions'
import { assistantsStore } from '@/store'
import { cn } from '@/utils/utils'

import { AssistantFormContext } from './AssistantForm/AssistantForm'

export interface AssistantOption {
  id: string
  name: string
  iconUrl?: string
  icon_url?: string // Support snake_case from API
  project?: string
  is_builtin_subagent?: boolean
  created_by?: {
    id: string
    name?: string
    username?: string
    email?: string
  }
  [k: string]: any
}

interface AssistantSelectorProps {
  disabled?: boolean
  singleValue?: boolean
  hideHeader?: boolean
  placeholder?: string

  value?: AssistantOption[]
  onChange: (value: AssistantOption[]) => void

  scope?: AssistantIndexScope
  project?: string
  error?: string

  className?: string
  selectClassName?: string
  errorClassName?: string
  enlargedLabel?: boolean

  // Allows injecting extra "virtual" assistant options (e.g. built-in subagents)
  // directly into the dropdown list. These will be placed at the top.
  extraOptionsTop?: AssistantOption[]
}

const BUILTIN_SUBAGENT_META =
  'inherits data sources, skills and tools, but uses built-in system prompt'

// Extracted AssistantOption component to comply with Rules of Hooks
const AssistantOptionComponent: React.FC<{ option: AssistantOption }> = ({ option }) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)

  const createdByName = option.created_by?.name ?? option.created_by?.username ?? ''
  const metadata = option.is_builtin_subagent
    ? BUILTIN_SUBAGENT_META
    : [option.project, createdByName ? `by ${createdByName}` : ''].filter(Boolean).join(' • ')

  return (
    <div className="flex items-center gap-2 w-full overflow-hidden">
      <Avatar
        iconUrl={option.iconUrl ?? option.icon_url}
        name={option.name}
        type={AvatarType.DROPDOWN}
      />
      <div className="flex flex-col min-w-0 flex-1">
        <p
          ref={optionEl}
          className="truncate text-sm font-medium"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isTruncated ? option.name : ''}
        >
          {option.name}
        </p>
        {!!metadata && <p className="text-xs text-text-tertiary truncate">{metadata}</p>}
      </div>
    </div>
  )
}

const AssistantSelector: React.FC<AssistantSelectorProps> = forwardRef<
  TMultiSelect,
  AssistantSelectorProps
>(
  (
    {
      disabled,
      singleValue = false,
      hideHeader,
      placeholder,
      value = [],
      onChange,
      scope,
      project,
      error,
      className,
      selectClassName,
      errorClassName,
      enlargedLabel = false,

      extraOptionsTop = [],
    },
    ref
  ) => {
    const [initialValue] = useState(value)

    const assistantsSnapshot = useSnapshot(assistantsStore)
    const { assistant } = useContext(AssistantFormContext)

    const SUB_ASSISTANTS_PAGE_SIZE = 12

    const loadList = useCallback(
      async ({ searchTerm, page }: LoadListParams): Promise<LoadListResult<AssistantOption>> => {
        const assistants =
          (await assistantsSnapshot.getAssistantOptions?.(
            searchTerm,
            { project, page, per_page: SUB_ASSISTANTS_PAGE_SIZE },
            scope
          )) || []

        const items = assistants.map((asst) => ({
          id: asst.id,
          name: asst.name,
          iconUrl: asst.icon_url,
          project: asst.project,
          created_by: asst.created_by,
        }))

        return { items, hasMore: items.length === SUB_ASSISTANTS_PAGE_SIZE }
      },
      [assistantsSnapshot, project, scope]
    )

    const { options, loadOptions, handleScrollBottom } = usePaginatedOptions<AssistantOption>({
      loadList,
    })

    const getMultiselectOptions = () => {
      // De-dupe by id while preserving order:
      // extraOptionsTop → loaded options → hidden selected options.
      const seen = new Set<string>()

      const addUnique = (items: AssistantOption[]) => {
        const result: AssistantOption[] = []
        for (const item of items) {
          if (!item?.id || seen.has(item.id)) continue
          seen.add(item.id)
          result.push(item)
        }
        return result
      }

      // Include selected values that might not be in the options list
      const hiddenOptions = value.filter(
        (selectedItem) => !options.find((option) => option.id === selectedItem.id)
      )

      return addUnique([...extraOptionsTop, ...options, ...hiddenOptions]).filter(
        (option) => option.id !== assistant?.id
      )
    }

    const resetValue = () => {
      onChange(initialValue)
    }

    useEffect(() => {
      // Reset selected value and reload options from page 0 whenever the project changes
      resetValue()
      loadOptions()
    }, [project])

    // Custom option renderer for MultiSelect
    const Option = (option: AssistantOption): React.ReactNode => {
      return <AssistantOptionComponent option={option} />
    }

    const handleChange = (selectedOptions: { value: string[] }) => {
      const options = getMultiselectOptions()
      const newValue = selectedOptions.value.map((id) => {
        const option = options.find((option) => option.id === id)
        return {
          id,
          name: option?.name || '',
          iconUrl: option?.iconUrl || '',
          project: option?.project,
          created_by: option?.created_by,
          is_builtin_subagent: option?.is_builtin_subagent,
        }
      })

      onChange(newValue)
    }
    const preparedValue = value.map((item) => item.id) || []

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {!hideHeader && (
          <>
            <div
              className={cn(
                enlargedLabel ? 'text-sm leading-6 text-white' : 'text-xs text-text-quaternary'
              )}
            >
              Sub-Assistants
            </div>
            <InfoBox className="mb-2">
              Important note: Including Assistants that have Sub-Assistants is not supported.
            </InfoBox>
          </>
        )}
        <MultiSelect
          ref={ref}
          key={project}
          disabled={disabled}
          value={preparedValue}
          onChange={handleChange}
          options={getMultiselectOptions()}
          label=""
          className="flex-1 max-w-full"
          inputClassName={selectClassName}
          errorClassName={errorClassName}
          placeholder={placeholder ?? 'Select Sub-Assistants'}
          onFilter={loadOptions}
          onScrollBottom={handleScrollBottom}
          renderOption={Option}
          error={error}
          fullWidth
          size="medium"
          optionLabel="name"
          optionValue="id"
          singleValue={singleValue}
          showCheckbox={!singleValue}
        />
      </div>
    )
  }
)

export default AssistantSelector
