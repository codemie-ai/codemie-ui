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

import { FC, useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import MultiSelect from '@/components/form/MultiSelect'
import Popup from '@/components/Popup'
import { projectsStore } from '@/store/projects'
import { Project } from '@/types/entity/project'
import toaster from '@/utils/toaster'

interface AssignProjectToCostCenterPopupProps {
  visible: boolean
  costCenterId: string
  onClose: () => void
  onSave: () => void
}

interface FormData {
  projects: string[]
}

const PROJECTS_PAGE_SIZE = 100
const MIN_SEARCH_LENGTH = 2

const AssignProjectToCostCenterPopup: FC<AssignProjectToCostCenterPopupProps> = ({
  visible,
  costCenterId,
  onClose,
  onSave,
}) => {
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      projects: [],
    },
  })

  const [submitError, setSubmitError] = useState('')
  const [availableProjects, setAvailableProjects] = useState<Project[]>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const requestIdRef = useRef(0)

  const selectedProjects = watch('projects')

  const handleProjectSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setSubmitError('')

    if (query.trim().length < MIN_SEARCH_LENGTH) {
      setAvailableProjects([])
      setIsLoadingProjects(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsLoadingProjects(true)

    try {
      const response = await projectsStore.searchProjects(query.trim(), 0, PROJECTS_PAGE_SIZE)

      if (requestId !== requestIdRef.current) {
        return
      }

      setAvailableProjects(response.data.filter((project) => !project.cost_center_id))
    } catch (error: any) {
      if (requestId !== requestIdRef.current) {
        return
      }

      console.error('Failed to search projects for cost center assignment:', error)
      setSubmitError(error?.parsedError?.message || error?.message || 'Failed to search projects')
      setAvailableProjects([])
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingProjects(false)
      }
    }
  }, [])

  const projectOptions = useMemo(
    () =>
      availableProjects.map((project) => ({
        label: project.name,
        value: project.name,
      })),
    [availableProjects]
  )

  const handleProjectChange = (value: string | string[] | null) => {
    let projectNames: string[]
    if (value === null) {
      projectNames = []
    } else if (Array.isArray(value)) {
      projectNames = value.filter(Boolean)
    } else {
      projectNames = value ? [value] : []
    }
    setValue('projects', projectNames)
    setSubmitError('')
  }

  const onSubmit = async (data: FormData) => {
    if (data.projects.length === 0) {
      return
    }

    try {
      await Promise.all(
        data.projects.map((projectName) =>
          projectsStore.updateProject(projectName, {
            cost_center_id: costCenterId,
          })
        )
      )
      toaster.info(`${data.projects.length} project(s) assigned to cost center`)
      reset()
      onSave()
    } catch (error: any) {
      console.error('Failed to assign projects to cost center:', error)
      setSubmitError(error?.parsedError?.message || error?.message || 'Failed to assign projects')
    }
  }

  const handleHide = () => {
    reset()
    setSubmitError('')
    setSearchQuery('')
    setAvailableProjects([])
    setIsLoadingProjects(false)
    onClose()
  }

  return (
    <Popup
      visible={visible}
      onHide={handleHide}
      header="Assign Project to Cost Center"
      onSubmit={handleSubmit(onSubmit)}
      submitText="Assign"
      submitDisabled={isSubmitting || isLoadingProjects || selectedProjects.length === 0}
      cancelText="Cancel"
      limitWidth
      withBorderBottom={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="font-mono text-sm font-normal leading-[21px] text-text-quaternary">
          Search by project name and select one or more unassigned projects to link to this cost
          center.
        </p>

        <MultiSelect
          id="projects"
          name="projects"
          value={selectedProjects}
          onChange={(e) => handleProjectChange(e.value)}
          options={projectOptions}
          label="Projects:"
          placeholder={isLoadingProjects ? 'Searching projects...' : 'Type to search projects'}
          filterPlaceholder="Search projects"
          onFilter={handleProjectSearch}
          singleValue={false}
          showCheckbox
          loading={isLoadingProjects}
          error={submitError}
          size="medium"
        />

        {!submitError && searchQuery.trim().length < MIN_SEARCH_LENGTH ? (
          <div className="text-sm text-text-tertiary">
            Type at least {MIN_SEARCH_LENGTH} characters to search unassigned projects.
          </div>
        ) : null}

        {!isLoadingProjects &&
        !submitError &&
        searchQuery.trim().length >= MIN_SEARCH_LENGTH &&
        projectOptions.length === 0 ? (
          <div className="text-sm text-text-tertiary">
            No unassigned projects found for this search.
          </div>
        ) : null}
      </form>
    </Popup>
  )
}

export default AssignProjectToCostCenterPopup
