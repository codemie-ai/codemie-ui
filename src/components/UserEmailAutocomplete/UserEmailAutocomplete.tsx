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

import { FC, useCallback, useEffect, useRef, useState } from 'react'

import Autocomplete from '@/components/form/Autocomplete/Autocomplete'
import { userStore } from '@/store/user'
import { FilterOption } from '@/types/filters'

const MIN_SEARCH_LENGTH = 2
const SEARCH_RESULTS_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 300

interface UserEmailAutocompleteProps {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  hint?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Email picker backed by the platform user directory.
 *
 * Type-ahead searches `GET /v1/admin/users?search=` and lets the admin pick a
 * platform user, but free-form entry is also allowed so a group alias
 * (e.g. `finops@example.com`) can be typed directly.
 *
 * Both `label` and `value` of an option are the email address. That is
 * deliberate: `Autocomplete` in `allowNew` mode commits the visible text on
 * blur (`onChange(textValue)`), so a label that differed from the value would
 * overwrite the stored email with the display string. The user's name is
 * carried in `FilterOption.id` and shown via `itemTemplate` instead.
 */
const UserEmailAutocomplete: FC<UserEmailAutocompleteProps> = ({
  id,
  value,
  onChange,
  label,
  hint,
  placeholder = 'Search users or type an email',
  error,
  disabled = false,
  className,
}) => {
  const [options, setOptions] = useState<FilterOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestIdRef = useRef(0)

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  const runSearch = useCallback(async (query: string) => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    setIsLoading(true)

    try {
      const users = await userStore.searchUsers(query, SEARCH_RESULTS_LIMIT)
      if (requestId !== requestIdRef.current) return

      setOptions(
        users
          .filter((user) => !!user.email)
          .map((user) => ({
            label: user.email,
            value: user.email,
            id: user.name ?? user.username ?? '',
          }))
      )
    } catch (searchError) {
      if (requestId !== requestIdRef.current) return
      // Non-blocking: the field still accepts free-form email entry.
      console.error('Failed to search users:', searchError)
      setOptions([])
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [])

  const handleSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (query.trim().length < MIN_SEARCH_LENGTH) {
        // Invalidate any in-flight request so its result cannot land later.
        requestIdRef.current += 1
        setOptions([])
        setIsLoading(false)
        return
      }

      debounceRef.current = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS)
    },
    [runSearch]
  )

  const renderOption = useCallback(
    (option: FilterOption) => (
      <div className="flex flex-col">
        {option.id && <span className="text-sm text-text-primary">{option.id}</span>}
        <span className="text-xs text-text-quaternary">{option.label}</span>
      </div>
    ),
    []
  )

  return (
    <Autocomplete
      id={id}
      label={label}
      hint={hint}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      error={error}
      disabled={disabled}
      className={className}
      allowNew
      allowEmpty
      localFilter={false}
      minSymbolsToSearch={MIN_SEARCH_LENGTH}
      onSearch={handleSearch}
      isLoadingIconVisible={isLoading}
      itemTemplate={renderOption}
    />
  )
}

export default UserEmailAutocomplete
