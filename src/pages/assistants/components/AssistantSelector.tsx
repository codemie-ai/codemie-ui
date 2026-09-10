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
import { ASSISTANT_INDEX_SCOPES, AssistantIndexScope } from '@/constants/assistants'
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
  icon_url?: string
  project?: string
  is_builtin_subagent?: boolean
  is_global?: boolean
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
  label?: string // Rendered by the inner MultiSelect, ignored when hideHeader is false
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
  scrollHeight?: string
  // Allows injecting extra "virtual" assistant options (e.g. built-in subagents)
  // directly into the dropdown list. These will be placed at the top.
  extraOptionsTop?: AssistantOption[]
  // When false, a project change reloads options but leaves `value` alone — for callers
  // that own their own clear-on-project-change behavior (e.g. a shared form-level effect).
  resetOnProjectChange?: boolean
  // Extra content rendered inside the dropdown panel, directly below the search box (e.g. scope tabs).
  panelHeaderExtra?: React.ReactNode
  // Shows a "Project" / "Marketplace" badge after each option's name, based on `is_global`.
  showScopeBadge?: boolean
}

const BUILTIN_SUBAGENT_META =
  'inherits data sources, skills and tools, but uses built-in system prompt'

const SCOPE_LABELS = {
  marketplace: 'Marketplace',
  project: 'Project',
} as const

// Extracted AssistantOption component to comply with Rules of Hooks
const AssistantOptionComponent: React.FC<{ option: AssistantOption; showScopeBadge?: boolean }> = ({
  option,
  showScopeBadge,
}) => {
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
        <div className="flex items-center gap-1.5 min-w-0">
          <p
            ref={optionEl}
            className="truncate text-sm font-medium"
            data-tooltip-id="react-tooltip"
            data-tooltip-content={isTruncated ? option.name : ''}
          >
            {option.name}
          </p>

          {showScopeBadge && (
            <span className="ml-2 text-xs text-text-tertiary">
              {option.is_global ? SCOPE_LABELS.marketplace : SCOPE_LABELS.project}
            </span>
          )}
        </div>

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
      label,
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
      scrollHeight,
      resetOnProjectChange = true,
      panelHeaderExtra,
      showScopeBadge,
    },
    ref
  ) => {
    const [initialValue] = useState(value)

    const assistantsSnapshot = useSnapshot(assistantsStore)
    const { assistant } = useContext(AssistantFormContext)

    const SUB_ASSISTANTS_PAGE_SIZE = 12

    const fetchScopePage = useCallback(
      async (
        fetchScope: AssistantIndexScope | undefined,
        fetchProject: string | undefined,
        searchTerm: string,
        page: number
      ) => {
        const assistants =
          (await assistantsSnapshot.getAssistantOptions?.(
            searchTerm,
            { project: fetchProject, page, per_page: SUB_ASSISTANTS_PAGE_SIZE },
            fetchScope
          )) || []

        return assistants.map((asst) => ({
          id: asst.id,
          name: asst.name,
          iconUrl: asst.icon_url,
          project: asst.project,
          created_by: asst.created_by,
          is_global: asst.is_global,
        }))
      },
      [assistantsSnapshot]
    )

    const loadList = useCallback(
      async ({ searchTerm, page }: LoadListParams): Promise<LoadListResult<AssistantOption>> => {
        const projectFilter = scope === ASSISTANT_INDEX_SCOPES.MARKETPLACE ? undefined : project

        const primaryItems = await fetchScopePage(scope, projectFilter, searchTerm, page)

        // ALL isn't automatically mixed with marketplace by the backend, so runnig the second query
        const marketplaceItems =
          scope === ASSISTANT_INDEX_SCOPES.ALL
            ? await fetchScopePage(ASSISTANT_INDEX_SCOPES.MARKETPLACE, undefined, searchTerm, page)
            : []

        return {
          items: [...primaryItems, ...marketplaceItems],
          hasMore:
            primaryItems.length === SUB_ASSISTANTS_PAGE_SIZE ||
            marketplaceItems.length === SUB_ASSISTANTS_PAGE_SIZE,
        }
      },
      [fetchScopePage, project, scope]
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
      if (resetOnProjectChange) resetValue()
      loadOptions()
    }, [project, scope])

    const Option = (option: AssistantOption): React.ReactNode => {
      return <AssistantOptionComponent option={option} showScopeBadge={showScopeBadge} />
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
          label={label ?? ''}
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
          scrollHeight={scrollHeight}
          panelHeaderExtra={panelHeaderExtra}
        />
      </div>
    )
  }
)

export default AssistantSelector
