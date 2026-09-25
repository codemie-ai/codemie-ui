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

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import MultiSelect from '@/components/form/MultiSelect/MultiSelect'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import { userStore } from '@/store/user'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300
const SEARCH_LIMIT = 10
const PROMPT_MESSAGE = 'Search by name or email'
const NO_RESULTS_MESSAGE = 'No results found'

export type UserOption = {
  label: string
  value: string
  email?: string
}

const renderUserOption = (option: UserOption): ReactNode => (
  <div className="flex flex-col min-w-0">
    <p className="text-sm font-medium truncate">{option.label}</p>
    <p className={`text-xs truncate ${option.email ? 'text-text-quaternary' : 'invisible'}`}>
      {option.email ?? ' '}
    </p>
  </div>
)

interface UserSelectorProps {
  value: string[]
  onChange: (userIds: string[]) => void
  label?: string
  placeholder?: string
  filterPlaceholder?: string
  extraOption?: UserOption
  disabled?: boolean
  fullWidth?: boolean
  hideLabel?: boolean
  id?: string
  className?: string
}

const UserSelector = ({
  value,
  onChange,
  label = 'User',
  placeholder = 'Select users',
  filterPlaceholder = 'Search users',
  extraOption,
  disabled,
  fullWidth,
  hideLabel,
  id,
  className,
}: UserSelectorProps) => {
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [seen, setSeen] = useState<Map<string, UserOption>>(new Map())

  const requestIdRef = useRef(0)

  const runSearch = useCallback(async () => {
    if (query.length < MIN_QUERY_LENGTH) return

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setLoading(true)
    try {
      const users = await userStore.searchUsers(query, SEARCH_LIMIT)
      if (requestId !== requestIdRef.current) return
      setFetched(
        users.map((user) => ({
          label: user.name ?? user.email ?? user.id,
          value: user.id,
          email: user.email ?? undefined,
        }))
      )
    } catch {
      if (requestId !== requestIdRef.current) return
      setFetched([])
    } finally {
      if (requestId === requestIdRef.current) {
        setHasSearched(true)
        setLoading(false)
      }
    }
  }, [query])

  useDebouncedApply(query, DEBOUNCE_MS, runSearch)

  const handleFilter = useCallback((next: string) => {
    setQuery(next)
    setHasSearched(false)
    if (next.length < MIN_QUERY_LENGTH) {
      setFetched([])
      requestIdRef.current += 1
      setLoading(false)
    }
  }, [])

  const options = useMemo(() => {
    const base =
      query.length < MIN_QUERY_LENGTH
        ? value.map((id) => seen.get(id)).filter((o): o is UserOption => !!o)
        : [...fetched]

    const trimmed = query.trim().toLowerCase()
    const matchesQuery = !!trimmed && !!extraOption?.label.toLowerCase().includes(trimmed)
    if (extraOption && matchesQuery && !base.some((o) => o.value === extraOption.value)) {
      base.push(extraOption)
    }
    return base
  }, [fetched, extraOption, query, value, seen])

  useEffect(() => {
    setSeen((prev) => {
      const next = new Map(prev)
      let added = false
      options.forEach((o) => {
        if (!next.has(o.value)) {
          next.set(o.value, o)
          added = true
        }
      })
      return added ? next : prev
    })
  }, [options])

  return (
    <MultiSelect
      label={label}
      hideLabel={hideLabel}
      id={id}
      className={className}
      value={value}
      options={options}
      onChange={(e) => onChange((e.value as string[] | undefined) ?? [])}
      onFilter={handleFilter}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      placeholder={placeholder}
      filterPlaceholder={filterPlaceholder}
      renderOption={renderUserOption}
      selectedItemTemplate={(id: string) => {
        const label = seen.get(id)?.label ?? id
        return id === value[value.length - 1] ? label : `${label}, `
      }}
      preserveOptionOrder
      serverSideFilter
      virtualScrollerOptions={{ itemSize: 48 }}
      hasVirtualScroll
      panelSize="md"
      emptyMessage={PROMPT_MESSAGE}
      emptyFilterMessage={hasSearched ? NO_RESULTS_MESSAGE : PROMPT_MESSAGE}
      showCheckbox
    />
  )
}

export default UserSelector
