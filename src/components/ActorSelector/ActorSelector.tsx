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

import UserSelector from '@/components/UserSelector/UserSelector'

interface ActorSelectorProps {
  value: string | null
  onChange: (actorId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Single-actor wrapper around UserSelector.
 *
 * UserSelector works with `string[]` for multi-select; ActorSelector adapts
 * that interface to a single nullable string value, so the modal can pass one
 * actor_id to the API without modifying UserSelector itself.
 */
const ActorSelector = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: ActorSelectorProps) => {
  const internalValue = value ? [value] : []

  // Single-select: only the first id is used. UserSelector is multi-select internally
  // but ActorSelector enforces single selection by always forwarding only userIds[0].
  const handleChange = (userIds: string[]) => {
    onChange(userIds[0] ?? null)
  }

  return (
    <UserSelector
      label="Actor"
      value={internalValue}
      onChange={handleChange}
      placeholder={placeholder ?? 'Filter by actor'}
      disabled={disabled}
      className={className}
    />
  )
}

export default ActorSelector
