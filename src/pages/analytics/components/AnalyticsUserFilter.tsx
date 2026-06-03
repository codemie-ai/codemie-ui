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

import { FC, useState, useEffect, useRef } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import MultiSelect from '@/components/form/MultiSelect'
import Hint from '@/components/Hint'
import { userStore } from '@/store/user'

import type { MultiSelectChangeEvent } from 'primereact/multiselect'

interface AnalyticsUserFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  userOptions: Array<{ label: string; value: string }>
  isLoadingOptions: boolean
}

const AnalyticsUserFilter: FC<AnalyticsUserFilterProps> = ({ value, onChange, userOptions }) => {
  const [meChecked, setMeChecked] = useState(false)
  const currentUser = userStore.user
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const prevCurrentUserIdRef = useRef<string>('')

  // Find current user ID from available options
  useEffect(() => {
    if (!currentUser || userOptions.length === 0) {
      setCurrentUserId('')
      prevCurrentUserIdRef.current = ''
      return
    }

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
      setCurrentUserId(newUserId)
      prevCurrentUserIdRef.current = newUserId

      // Only add user if Me is checked AND user just became available (was not available before)
      if (meChecked && !value.includes(newUserId) && !prevUserId) {
        onChange([...value, newUserId])
      }
    } else {
      setCurrentUserId('')
      prevCurrentUserIdRef.current = ''
    }
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

  const toggleCurrentUser = (checked: boolean) => {
    setMeChecked(checked)

    if (checked) {
      // Only add current user if they exist in options (have data)
      if (currentUserId && !value.includes(currentUserId)) {
        onChange([...value, currentUserId])
      }
    } else if (currentUserId) {
      // Remove current user from selection
      onChange(value.filter((id) => id !== currentUserId))
    }
  }

  const handleUsersChange = (e: MultiSelectChangeEvent) => {
    onChange(e.value)
  }

  // Filter value to only include users that exist in userOptions (for display)
  const displayValue = value.filter((userId) => availableUserIds.has(userId))

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
        options={userOptions}
        onChange={handleUsersChange}
        placeholder="Users"
        fullWidth
        onFilter={() => {}}
        filterPlaceholder="Search users"
        showCheckbox
        hasVirtualScroll
        virtualScrollerOptions={{ itemSize: 32 }}
      />
    </div>
  )
}

export default AnalyticsUserFilter
