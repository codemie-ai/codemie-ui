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

import { FC, useState, useEffect } from 'react'

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

const AnalyticsUserFilter: FC<AnalyticsUserFilterProps> = ({
  value,
  onChange,
  userOptions,
  isLoadingOptions,
}) => {
  const [isChecked, setIsChecked] = useState(false)
  const currentUser = userStore.user
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [previousUsers, setPreviousUsers] = useState<string[]>([])

  // Find current user ID from available options
  useEffect(() => {
    if (!currentUser || userOptions.length === 0) {
      setCurrentUserId('')
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
      setCurrentUserId(matchingOption.value)
    } else {
      setCurrentUserId('')
    }
  }, [currentUser, userOptions])

  // Update checkbox state based on current selection
  // Checkbox is checked only when current user is the sole selection
  useEffect(() => {
    if (currentUserId && value) {
      setIsChecked(value.length === 1 && value.includes(currentUserId))
    }
  }, [value, currentUserId])

  // Filter out users that are no longer in the available options
  useEffect(() => {
    // Wait for options to finish loading before validating
    if (isLoadingOptions || !value.length) return

    const availableUserIds = new Set(userOptions.map((option) => option.value))
    const validUserIds = value.filter((userId) => availableUserIds.has(userId))

    // Update the value if some users are no longer available
    if (validUserIds.length !== value.length) {
      onChange(validUserIds)
    }
  }, [userOptions, value, onChange, isLoadingOptions])

  const toggleCurrentUser = (checked: boolean) => {
    setIsChecked(checked)

    if (checked) {
      // Save previous selection before replacing with only current user
      if (value.length > 0) {
        setPreviousUsers(value)
      }
      // Replace selection with only current user
      onChange([currentUserId])
    } else {
      // Restore previous selection or clear
      onChange(previousUsers.length > 0 ? previousUsers : [])
      setPreviousUsers([])
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
          >
            <Checkbox
              checked={isChecked}
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
        value={value ?? []}
        options={userOptions}
        onChange={handleUsersChange}
        placeholder="Users"
        fullWidth
        onFilter={() => {}}
        filterPlaceholder="Search users"
        showCheckbox
      />
    </div>
  )
}

export default AnalyticsUserFilter
