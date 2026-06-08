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

import { FC, useState, useEffect, useRef, useMemo } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import MultiSelect from '@/components/form/MultiSelect'
import Hint from '@/components/Hint'
import { userStore } from '@/store/user'

import type { MultiSelectChangeEvent } from 'primereact/multiselect'

interface AnalyticsUserFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  userOptions: Array<{ label: string; value: string }>
  isLoadingOptions?: boolean
  isAdmin?: boolean
  onSearchChange?: (term: string) => void
}

const AnalyticsUserFilter: FC<AnalyticsUserFilterProps> = ({
  value,
  onChange,
  userOptions,
  isAdmin = false,
  onSearchChange = () => {},
}) => {
  const [meChecked, setMeChecked] = useState(false)
  const currentUser = userStore.user
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const prevCurrentUserIdRef = useRef<string>('')
  const currentUserOptionRef = useRef<{ label: string; value: string } | null>(null)

  // Find current user ID from available options
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserId('')
      prevCurrentUserIdRef.current = ''
      currentUserOptionRef.current = null
      return
    }

    if (userOptions.length === 0) return

    // Try to match user by checking if any option value matches user properties
    const matchingOption = userOptions.find((option) => {
      const { value: optionId } = option
      return (
        optionId === currentUser.userId ||
        optionId === currentUser.username ||
        optionId === currentUser.name
      )
    })

    if (matchingOption) {
      const newUserId = matchingOption.value
      const prevUserId = prevCurrentUserIdRef.current
      currentUserOptionRef.current = matchingOption
      setCurrentUserId(newUserId)
      prevCurrentUserIdRef.current = newUserId

      // Only add user if Me is checked AND user just became available (was not available before)
      if (meChecked && !value.includes(newUserId) && !prevUserId) {
        onChange([...value, newUserId])
      }
    }
    // Do not clear currentUserId when user isn't in current search results —
    // once identified, the Me checkbox should stay enabled across searches.
  }, [currentUser, userOptions, meChecked, value, onChange])

  // Initialize checkbox state from incoming value (only on mount or when currentUserId first becomes available)
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (currentUserId && value && !hasInitializedRef.current) {
      setMeChecked(value.includes(currentUserId))
      hasInitializedRef.current = true
    }
  }, [currentUserId, value])

  const availableUserIds = new Set(userOptions.map((option) => option.value))
  const prevValueRef = useRef<string[]>(value)
  useEffect(() => {
    const valueChanged = prevValueRef.current !== value
    prevValueRef.current = value

    if (
      valueChanged &&
      meChecked &&
      currentUserId &&
      availableUserIds.has(currentUserId) &&
      !value.includes(currentUserId)
    ) {
      setMeChecked(false)
    }
  }, [value, currentUserId, meChecked, userOptions])

  // Accumulate option objects for selected users so they persist across search changes
  const [stickyOptions, setStickyOptions] = useState<Map<string, { label: string; value: string }>>(
    new Map()
  )

  useEffect(() => {
    setStickyOptions((prev) => {
      const next = new Map(prev)
      userOptions.forEach((opt) => {
        if (value.includes(opt.value)) next.set(opt.value, opt)
      })
      for (const id of next.keys()) {
        if (!value.includes(id)) next.delete(id)
      }
      return next
    })
  }, [userOptions, value])

  const mergedOptions = useMemo(() => {
    const currentIds = new Set(userOptions.map((o) => o.value))
    const extras = [...stickyOptions.values()].filter((o) => !currentIds.has(o.value))
    return extras.length === 0 ? userOptions : [...userOptions, ...extras]
  }, [userOptions, stickyOptions])

  // Only show IDs that have a known option — prevents null labels for users
  // whose options haven't been loaded in this session yet.
  const displayValue = useMemo(() => {
    const knownIds = new Set(mergedOptions.map((o) => o.value))
    return value.filter((id) => knownIds.has(id))
  }, [value, mergedOptions])

  const toggleCurrentUser = (checked: boolean) => {
    setMeChecked(checked)

    if (checked) {
      if (currentUserId && !value.includes(currentUserId)) {
        // Ensure the current user's option is in the sticky cache so it
        // renders with a label even when they're not in the current search results.
        const opt = currentUserOptionRef.current
        if (opt) {
          setStickyOptions((prev) => new Map(prev).set(currentUserId, opt))
        }
        onChange([...value, currentUserId])
      }
    } else if (currentUserId) {
      onChange(value.filter((id) => id !== currentUserId))
    }
  }

  const handleUsersChange = (e: MultiSelectChangeEvent) => {
    onChange(e.value)
  }

  return (
    <div>
      <div className="mb-2 ml-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-text-tertiary">Users</span>
          <div
            data-tooltip-id="react-tooltip"
            data-tooltip-content={
              !currentUserId
                ? 'Analytics data selected with current filters values contain no data for current user.'
                : undefined
            }
            data-tooltip-class-name="break-keep"
          >
            <Checkbox
              checked={meChecked}
              onChange={toggleCurrentUser}
              label="Me"
              disabled={!currentUserId}
              rootClassName="gap-x-0 mr-2"
            />
          </div>
          <Hint
            hint="Options for this dropdown are displayed based on the data available in the current dashboard (including filtering). Sometimes multiple names or other identifiers can be traced to the same user. In those cases identifiers will be merged into one option and additional ones will be shown in parentheses."
            id="analytics-user-filter-hint"
          />
        </div>
      </div>
      <MultiSelect
        id="users"
        value={displayValue}
        options={mergedOptions}
        onChange={handleUsersChange}
        placeholder="Users"
        fullWidth
        onFilter={isAdmin ? onSearchChange : () => {}}
        filterPlaceholder="Search users"
        showCheckbox
        hasVirtualScroll
        virtualScrollerOptions={{ itemSize: 32 }}
      />
    </div>
  )
}

export default AnalyticsUserFilter
