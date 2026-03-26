import { FC } from 'react'

import Select from '@/components/form/Select/Select'
import { USER_ROLES, UserRole } from '@/constants/user'
import { FilterOption } from '@/types/filters'

const ROLE_OPTIONS: FilterOption[] = [
  { label: 'User', value: USER_ROLES.user },
  { label: 'Admin', value: USER_ROLES.admin },
]

interface UserRoleSelectorProps {
  value: UserRole
  className?: string
  disabled?: boolean
  label?: string
  onChange: (role: UserRole) => void
}

const UserRoleSelector: FC<UserRoleSelectorProps> = ({
  value,
  onChange,
  className,
  disabled = false,
  label = 'Role',
}) => {
  return (
    <Select
      value={value}
      label={label}
      onChange={(e) => onChange(e.value as UserRole)}
      options={ROLE_OPTIONS}
      className={className}
      disabled={disabled}
    />
  )
}

export default UserRoleSelector
