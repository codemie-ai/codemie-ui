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

import { yupResolver } from '@hookform/resolvers/yup'
import { FC } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import Popup from '@/components/Popup'
import ProjectSelector from '@/components/ProjectSelector'
import { userStore } from '@/store/user'
import { ProjectRole } from '@/types/entity/project'
import { UserListItem } from '@/types/entity/user'

import ProjectRoleSelector from '../ProjectRoleSelector'

interface AssignToProjectPopupProps {
  isOpen: boolean
  selectedUsers: UserListItem[]
  onClose: () => void
  onSave: () => void
}

const schema = yup.object({
  project: yup.string().required('Project is required'),
  role: yup.string().oneOf(Object.values(ProjectRole)).required('Role is required'),
})

type AssignToProjectFormData = yup.InferType<typeof schema>

const AssignToProjectPopup: FC<AssignToProjectPopupProps> = ({
  isOpen,
  selectedUsers,
  onClose,
  onSave,
}) => {
  const { control, handleSubmit } = useForm<AssignToProjectFormData>({
    resolver: yupResolver(schema),
    defaultValues: { project: '', role: ProjectRole.USER },
    shouldUnregister: true,
  })

  const onSubmit = async (data: AssignToProjectFormData) => {
    const userIds = selectedUsers.map((user) => user.id)
    try {
      await userStore.bulkAssignToProject(userIds, data.project, data.role)
      onSave()
    } catch (error) {
      console.error('Failed to assign users to project:', error)
    }
  }

  return (
    <Popup
      header="Assign to Project"
      className="w-[500px]"
      submitText="Assign"
      visible={isOpen}
      onHide={() => onClose()}
      onSubmit={handleSubmit(onSubmit)}
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-primary">
          Assign {selectedUsers.length} selected user(s) to a project
        </p>

        <Controller
          name="project"
          control={control}
          render={({ field, fieldState }) => (
            <ProjectSelector
              label="Project"
              value={field.value}
              onChange={(value) => field.onChange(value as string)}
              multiple={false}
              selectDefault={false}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          name="role"
          control={control}
          render={({ field }) => <ProjectRoleSelector {...field} className="!h-8" />}
        />
      </div>
    </Popup>
  )
}

export default AssignToProjectPopup
