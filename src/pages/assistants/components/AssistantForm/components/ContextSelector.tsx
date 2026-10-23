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

import { MultiSelect as PrimeMultiselect } from 'primereact/multiselect'
import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Announcement from '@/components/Announcement/Announcement'
import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import MultiSelect from '@/components/form/MultiSelect'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { useAnnouncementQueue } from '@/hooks/useAnnouncementQueue'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import EditIndexPopup from '@/pages/dataSources/components/DataSourceForm/EditIndexPopup'
import { assistantsStore } from '@/store'
import { dataSourceStore } from '@/store/dataSources'
import { humanize, pluralize } from '@/utils/helpers'
import { getContextTypeLabel } from '@/utils/indexing'
import { cn } from '@/utils/utils'

import { AssistantFormContext } from '../AssistantForm'
import { createContextChipRenderer } from './ContextChip'

const LOCAL_FILTER_ANNOUNCE_DELAY_MS = 500

export type AssistantContextOption = {
  id?: string
  name: string
  context_type: string
}

interface ContextSelectorProps {
  value?: AssistantContextOption[]
  onChange: (value: AssistantContextOption[]) => void
  isAIGenerated?: boolean
  project?: string
  withID?: boolean
  initialOptions?: AssistantContextOption[]
  singleValue?: boolean
  hideHeader?: boolean
  hideAddButton?: boolean
  placeholder?: string
  className?: string
  selectClassName?: string
  errorClassName?: string
  error?: string
  disabled?: boolean
  paginated?: boolean
  enlargedLabel?: boolean
  display?: 'comma' | 'chip'
}

const OptionTemplate = ({ data: value }: { data: AssistantContextOption }) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)

  return (
    <div className="flex items-center gap-1 w-full">
      <span
        ref={optionEl}
        className="truncate"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={isTruncated ? value.name : ''}
      >
        {value.name}
      </span>
      <div className="px-2 py-0.5 rounded-full flex items-center uppercase text-xs text-text-quaternary ml-2 border border-border-subtle bg-not-started-tertiary">
        {humanize(value.context_type)}
      </div>
    </div>
  )
}

const ContextSelector = forwardRef<
  { focus: () => void; scrollIntoView: (options: ScrollIntoViewOptions) => void },
  ContextSelectorProps
>(
  (
    {
      value = [],
      onChange,
      isAIGenerated = false,
      project: projectProps,
      withID = false,
      initialOptions,
      singleValue = false,
      hideHeader = false,
      hideAddButton = false,
      placeholder = 'Select Datasource Context',
      className,
      selectClassName,
      errorClassName,
      error,
      disabled = false,
      paginated,
      enlargedLabel = false,
      display,
    }: ContextSelectorProps,
    ref
  ) => {
    const multiSelectRef = useRef<PrimeMultiselect | null>(null)
    const [isLoading, setIsLoading] = useState(!initialOptions)
    const [contextOptions, setContextOptions] = useState<AssistantContextOption[]>(
      initialOptions ?? []
    )
    const [isEditIndexPopupVisible, setIsEditIndexPopupVisible] = useState(false)
    const [filteredValues, setFilteredValues] = useState<AssistantContextOption[]>(value)

    const { project: contextProject } = useContext(AssistantFormContext)

    const filterTerm = useRef('')
    const localFilterTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const { announce, announcement } = useAnnouncementQueue()

    const announceCount = (count: number) => {
      announce(count > 0 ? `${count} ${pluralize(count, 'result')} found` : 'No results found')
    }

    useEffect(() => {
      if (!filterTerm.current) return
      announceCount(contextOptions.length)
    }, [contextOptions])

    useEffect(() => () => clearTimeout(localFilterTimeout.current), [])

    // Without `paginated` the MultiSelect filters the loaded options itself and contextOptions
    // never changes, so the count is worked out here. It matches by label, case-insensitive
    // "contains", like the MultiSelect does. Debounced so typing announces once, not per key.
    const announceLocalFilter = (term: string) => {
      clearTimeout(localFilterTimeout.current)
      const query = term.trim().toLocaleLowerCase()
      if (!query) return
      localFilterTimeout.current = setTimeout(() => {
        announceCount(
          contextOptions.filter((option) => option.name.toLocaleLowerCase().includes(query)).length
        )
      }, LOCAL_FILTER_ANNOUNCE_DELAY_MS)
    }

    const project = projectProps || contextProject
    const optionKey = withID ? 'id' : 'name'

    useImperativeHandle(
      ref,
      () => ({
        focus: () => multiSelectRef.current?.getElement()?.focus(),
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          multiSelectRef.current?.getElement()?.scrollIntoView(options)
        },
      }),
      []
    )

    const fetchAssistantContextOptions = async (searchQuery = '') => {
      setIsLoading(true)
      try {
        let contextOptions: AssistantContextOption[]

        if (paginated) {
          const filters = {
            ...(project && { project }),
            ...(searchQuery && { query: searchQuery }),
          }
          const indexes = await dataSourceStore.getDataSourceOptions(filters)
          contextOptions = indexes.map((index: any) => ({
            ...(withID ? { id: index.id } : {}),
            name: index.repo_name,
            context_type: getContextTypeLabel(index.index_type),
          }))
        } else {
          contextOptions = await assistantsStore.getAssistantContext(project, withID)
        }

        setContextOptions(contextOptions)
      } finally {
        setIsLoading(false)
      }
    }

    const handleDatasourcePopupClose = () => {
      setIsEditIndexPopupVisible(false)
      // CR-002: clear the filter term before reloading so the announcement
      // useEffect guard returns early and no spurious count fires on popup close.
      filterTerm.current = ''
      fetchAssistantContextOptions()
    }

    const updateFilteredValues = (value: any) => {
      const newFilteredValues = value.filter((item) =>
        contextOptions.find((option) => option[optionKey] === item[optionKey])
      )
      setFilteredValues(newFilteredValues)
    }

    useEffect(() => {
      if (initialOptions) {
        setContextOptions(initialOptions)
        setIsLoading(false)
      } else {
        fetchAssistantContextOptions()
      }
    }, [project, initialOptions])

    useEffect(() => {
      updateFilteredValues(value)
    }, [value, contextOptions])

    const mapContextToMultiselectOption = (options: AssistantContextOption[]) =>
      options.map((option) => ({
        value: withID ? option.id : option.name,
        label: option.name,
        data: option,
      }))

    const multiselectOptions = useMemo(
      () => mapContextToMultiselectOption(contextOptions),
      [contextOptions]
    )

    const selectedValues = useMemo(() => {
      return filteredValues
        .map((item) => item[optionKey])
        .filter((val): val is string => val !== undefined)
    }, [filteredValues, withID])

    const handleChange = (e: { value: string[] }) => {
      if (singleValue && (!e.value || e.value.length === 0)) {
        return
      }

      let newValue = e.value

      if (singleValue && newValue.length > 1) {
        newValue = [newValue[newValue.length - 1]]
      }

      const fullObjects = newValue
        .map((val) => contextOptions.find((option) => option[optionKey] === val))
        .filter((option): option is AssistantContextOption => option !== undefined)

      onChange(fullObjects)
    }

    const [isKnowledgeBasesEnabled] = useFeatureFlag(FEATURE_FLAGS.KNOWLEDGE_BASES)
    const [isDatasourcesEnabled] = useFeatureFlag(FEATURE_FLAGS.DATASOURCES)
    const [isCodeIndexingEnabled] = useFeatureFlag(FEATURE_FLAGS.CODE_INDEXING)
    const isDataSourcesSurfaceEnabled =
      isKnowledgeBasesEnabled || isDatasourcesEnabled || isCodeIndexingEnabled

    const shouldShowAddButton = !hideHeader && !hideAddButton && isDataSourcesSurfaceEnabled

    const preparedSelectedItemTemplate = useMemo(() => {
      if (display === 'chip') {
        return createContextChipRenderer(value || [])
      }
      return null
    }, [display, value])

    if (!isDataSourcesSurfaceEnabled) {
      return null
    }

    return (
      <div className={className}>
        {!hideHeader && (
          <div className="flex flex-col gap-4 mb-2">
            <div className="flex justify-between items-end">
              <div
                className={cn(
                  'flex items-center gap-2',
                  enlargedLabel ? 'text-sm leading-6 text-white' : 'text-xs text-text-quaternary'
                )}
              >
                Datasource Context
                {isAIGenerated && <AIFieldSvg className="w-4 h-4" />}
              </div>
              {shouldShowAddButton && (
                <Button variant="secondary" onClick={() => setIsEditIndexPopupVisible(true)}>
                  <PlusSvg /> Create
                </Button>
              )}
            </div>
            <InfoBox>
              Important note: Only repositories that have fully completed the indexing process are
              available for selection.
            </InfoBox>
            {!contextOptions.length && (
              <InfoBox>
                You do not have any processed data sources. You can add a new one below.
              </InfoBox>
            )}
          </div>
        )}

        <Announcement announcement={announcement} />

        <div className="flex gap-2">
          <MultiSelect
            ref={multiSelectRef}
            label=""
            id="context-selector"
            name="context"
            value={selectedValues}
            onFilter={(e) => {
              if (paginated) {
                filterTerm.current = e
                fetchAssistantContextOptions(e)
              } else {
                announceLocalFilter(e)
              }
            }}
            options={multiselectOptions as unknown as Record<string, string>[]}
            onChange={handleChange}
            placeholder={placeholder}
            className="max-w-full"
            inputClassName={selectClassName}
            fullWidth
            size="medium"
            loading={isLoading}
            renderOption={OptionTemplate}
            singleValue={singleValue}
            disabled={disabled}
            error={error}
            errorClassName={errorClassName}
            showCheckbox={!singleValue}
            hasVirtualScroll
            virtualScrollerOptions={{ itemSize: 34 }}
            display={display}
            selectedItemTemplate={preparedSelectedItemTemplate}
          />
        </div>

        {shouldShowAddButton && (
          <EditIndexPopup
            visible={isEditIndexPopupVisible}
            onFormClose={handleDatasourcePopupClose}
            onClose={handleDatasourcePopupClose}
            defaultProject={project}
            canFullIndex={false}
            canPartialIndex={false}
          />
        )}
      </div>
    )
  }
)

export default ContextSelector
