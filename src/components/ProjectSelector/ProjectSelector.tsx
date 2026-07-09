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

import { MultiSelect as PrimeMultiselect, MultiSelectChangeEvent } from 'primereact/multiselect'
import { forwardRef, useEffect, useState } from 'react'

import MultiSelect from '@/components/form/MultiSelect'
import { userStore } from '@/store/user'
import { getProjectDisplayName } from '@/utils/projectDisplayName'

import { MultiSelectSize } from '../form/MultiSelect/MultiSelect'

interface ProjectSelectorProps {
  value?: string | string[] | null
  onChange: (value: string | string[]) => void
  disabled?: boolean
  label?: string
  hideLabel?: boolean
  className?: string
  multiple?: boolean
  fullWidth?: boolean
  adminOnly?: boolean
  selectDefault?: boolean
  error?: string
  size?: MultiSelectSize | `${MultiSelectSize}`
}

const ProjectSelector = forwardRef<PrimeMultiselect, ProjectSelectorProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      label,
      hideLabel = false,
      className = '',
      multiple = false,
      fullWidth = false,
      adminOnly = false,
      selectDefault = true,
      error,
      size = 'medium',
    },
    ref
  ) => {
    const [availableProjects, setAvailableProjects] = useState<
      Array<{ label: string; value: string }>
    >([])
    const loadProjects = async (search = '') => {
      const projects = await userStore.getProjects(search, adminOnly)

      // Add current value(s) to projects if not already included
      if (value) {
        const currentNames = Array.isArray(value) ? value : [value]
        currentNames.forEach((v) => {
          if (!projects.some((p) => p.name === v)) {
            projects.push({ name: v })
          }
        })
      }

      setAvailableProjects(
        projects.map((project) => ({ label: getProjectDisplayName(project), value: project.name }))
      )

      // Auto-select first project only for single select when no value
      if (!value && projects.length > 0 && !multiple && selectDefault) {
        onChange?.(projects[0].name)
      }
    }

    const handleFilter = (value: string) => {
      const searchValue = value.trim().toLowerCase()
      loadProjects(searchValue)
    }

    useEffect(() => {
      loadProjects()
    }, [])

    const handleChange = (e: MultiSelectChangeEvent) => {
      onChange(multiple ? e.value : e.target.value)
    }

    const placeholder = 'Project'
    const filterPlaceholder = 'Search for project'

    return (
      <MultiSelect
        size={size}
        label={label ?? 'Project'}
        value={value ?? ''}
        options={availableProjects}
        onChange={handleChange}
        disabled={disabled}
        hideLabel={hideLabel}
        className={className}
        fullWidth={fullWidth}
        id="project-selector"
        name="project-selector"
        placeholder={placeholder}
        filterPlaceholder={filterPlaceholder}
        onFilter={handleFilter}
        showCheckbox={multiple}
        singleValue={!multiple}
        error={error}
        ref={ref}
      />
    )
  }
)

export default ProjectSelector
