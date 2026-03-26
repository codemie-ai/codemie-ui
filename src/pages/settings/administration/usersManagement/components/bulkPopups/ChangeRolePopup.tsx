import { yupResolver } from '@hookform/resolvers/yup'
import { FC } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'

import Popup from '@/components/Popup'
import ProjectSelector from '@/components/ProjectSelector'
import { USER_ROLES } from '@/constants/user'
import { userStore } from '@/store/user'
import { UserListItem } from '@/types/entity/user'

import UserRoleSelector from '../UserRoleSelector'

interface ChangeRolePopupProps {
  isOpen: boolean
  selectedUsers: UserListItem[]
  onClose: () => void
  onSave: () => void
}

const schema = yup.object({
  project: yup.string().required('Project is required'),
  role: yup.string().oneOf(Object.values(USER_ROLES)).required('Role is required'),
})

type ChangeRoleFormData = yup.InferType<typeof schema>

const ChangeRolePopup: FC<ChangeRolePopupProps> = ({ isOpen, selectedUsers, onClose, onSave }) => {
  const { control, handleSubmit } = useForm<ChangeRoleFormData>({
    shouldUnregister: true,
    defaultValues: { project: '', role: USER_ROLES.user },
    resolver: yupResolver(schema),
  })

  const onSubmit = async (data: ChangeRoleFormData) => {
    const userIds = selectedUsers.map((user) => user.id)
    try {
      await userStore.bulkUpdateUsersProjectRole(userIds, data.project, data.role)
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
          Change role for {selectedUsers.length} selected user(s)
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
          render={({ field }) => (
            <UserRoleSelector value={field.value} onChange={field.onChange} className="!h-8" />
          )}
        />
      </div>
    </Popup>
  )
}

export default ChangeRolePopup
