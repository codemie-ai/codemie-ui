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

import React, { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import Autocomplete from '@/components/form/Autocomplete'
import { Checkbox } from '@/components/form/Checkbox'
import { userStore } from '@/store/user'
import { FilterDefinition } from '@/types/filters'
import { humanize } from '@/utils/helpers'

interface UserFilterProps {
  definition: FilterDefinition
  value: string
  onChange: (value: string) => void
  isChecked: boolean
  setIsChecked: (checked: boolean) => void
}

const UserFilter: React.FC<UserFilterProps> = ({
  definition,
  value,
  onChange,
  isChecked = false,
  setIsChecked,
}) => {
  const [previousCreatedBy, setPreviousCreatedBy] = useState<string | null>(null)
  const { user } = useSnapshot(userStore)
  const currentUserName = useMemo(() => {
    const currentUserOption = definition.options.find((option) => option.id === user?.username)

    return typeof currentUserOption?.value === 'string'
      ? currentUserOption.value
      : user?.name ?? user?.username ?? ''
  }, [definition.options, user?.name, user?.username])

  useEffect(() => {
    setIsChecked(Boolean(currentUserName) && value === currentUserName)
  }, [currentUserName, setIsChecked, value])

  const toggleCreatedByMe = (checked: boolean) => {
    setIsChecked(checked)
    if (checked) {
      if (value && value !== currentUserName) {
        setPreviousCreatedBy(value)
      }
      onChange(currentUserName)
    } else {
      onChange(previousCreatedBy || '')
    }
  }

  return (
    <div>
      <div className="mb-2 ml-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-text-tertiary">
            {definition.label || humanize(definition.name)}
          </span>
          <Checkbox
            checked={isChecked}
            disabled={!currentUserName}
            onChange={toggleCreatedByMe}
            label="Me"
            rootClassName="gap-x-0"
          />
        </div>
      </div>
      <Autocomplete
        id={definition.name}
        value={value}
        onChange={onChange}
        options={definition.options}
        placeholder={humanize(definition.name)}
        className="w-full wrapper"
      />
    </div>
  )
}

export default UserFilter
