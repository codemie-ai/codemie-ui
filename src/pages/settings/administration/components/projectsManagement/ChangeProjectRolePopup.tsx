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
import { userStore } from '@/store/user'
import { ProjectRole } from '@/types/entity/project'
import { UserListItem } from '@/types/entity/user'

import ProjectRoleSelector from '../../usersManagement/components/ProjectRoleSelector'

interface ChangeProjectRolePopupProps {
  isOpen: boolean
  projectName: string
  selectedUsers: UserListItem[]
  onClose: () => void
  onSave: () => void
}

const schema = yup.object({
  role: yup.string().oneOf(Object.values(ProjectRole)).required('Role is required'),
})

type ChangeRoleFormData = yup.InferType<typeof schema>

const ChangeProjectRolePopup: FC<ChangeProjectRolePopupProps> = ({
  isOpen,
  projectName,
  selectedUsers,
  onClose,
  onSave,
}) => {
  const { control, handleSubmit } = useForm<ChangeRoleFormData>({
    shouldUnregister: true,
    defaultValues: { role: ProjectRole.USER },
    resolver: yupResolver(schema),
  })

  const onSubmit = async (data: ChangeRoleFormData) => {
    const userIds = selectedUsers.map((user) => user.id)
    try {
      await userStore.bulkUpdateUsersProjectRole(userIds, projectName, data.role)
      onSave()
    } catch (error) {
      console.error('Failed to change user roles:', error)
    }
  }

  return (
    <Popup
      header="Change Role"
      className="w-[500px]"
      submitText="Save"
      visible={isOpen}
      onHide={() => onClose()}
      onSubmit={handleSubmit(onSubmit)}
      withBorderBottom={false}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-primary">
          Change role for {selectedUsers.length} selected user(s) in project{' '}
          <strong>{projectName}</strong>
        </p>

        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <ProjectRoleSelector value={field.value} onChange={field.onChange} className="!h-8" />
          )}
        />
      </div>
    </Popup>
  )
}

export default ChangeProjectRolePopup
