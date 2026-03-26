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
