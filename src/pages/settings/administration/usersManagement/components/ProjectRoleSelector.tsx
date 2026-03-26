import { FC } from 'react'

import Select from '@/components/form/Select/Select'
import { ProjectRole } from '@/types/entity/project'
import { FilterOption } from '@/types/filters'

const PROJECT_ROLE_OPTIONS: FilterOption[] = [
  { label: 'User', value: ProjectRole.USER },
  { label: 'Project Admin', value: ProjectRole.ADMINISTRATOR },
]

interface ProjectRoleSelectorProps {
  value: ProjectRole
  className?: string
  disabled?: boolean
  label?: string
  onChange: (role: ProjectRole) => void
}

const ProjectRoleSelector: FC<ProjectRoleSelectorProps> = ({
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
      onChange={(e) => onChange(e.value as ProjectRole)}
      options={PROJECT_ROLE_OPTIONS}
      className={className}
      disabled={disabled}
    />
  )
}

export default ProjectRoleSelector
